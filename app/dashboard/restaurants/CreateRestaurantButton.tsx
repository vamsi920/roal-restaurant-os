"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlanLimitNotice } from "@/components/billing/PlanLimitNotice";
import type { SerializableGateVerdict } from "@/lib/billing/gates";
import { formatApiRouteError } from "@/lib/dashboard/format-user-error";
import { cn } from "@/lib/cn";
import {
  parseVoiceAgentProvisionApiResult,
  resolvePostCreateRestaurantHref,
  voiceProvisionNoticeFromApi,
} from "@/lib/voice-agent/provision-display";

export function CreateRestaurantButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [locationGate, setLocationGate] =
    useState<SerializableGateVerdict | null>(null);
  const [gatesLoading, setGatesLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [submitHint, setSubmitHint] = useState<string | null>(null);
  const router = useRouter();

  async function loadGates() {
    setGatesLoading(true);
    try {
      const res = await fetch("/api/billing/gates");
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.gates?.create_restaurant) {
        setLocationGate(body.gates.create_restaurant);
      }
    } finally {
      setGatesLoading(false);
    }
  }

  function openDialog() {
    setOpen(true);
    setError(null);
    setSubmitHint(null);
    void loadGates();
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitHint(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }
    if (locationGate?.hardBlocked) {
      setError(locationGate.message);
      return;
    }
    startTransition(async () => {
      setSubmitHint("Creating location and setting up voice agent…");
      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent("/dashboard/restaurants")}`;
        return;
      }
      if (!res.ok) {
        setSubmitHint(null);
        setError(
          formatApiRouteError(body, res.status, "Could not create restaurant. Try again.")
        );
        return;
      }
      const restaurant = body.restaurant as { id?: string } | undefined;
      if (!restaurant?.id) {
        setSubmitHint(null);
        setError("Invalid server response");
        return;
      }

      const provision = parseVoiceAgentProvisionApiResult(
        body.voice_agent_provision
      );
      const notice = voiceProvisionNoticeFromApi(provision);
      if (notice && provision?.ok === false && !("skipped" in provision && provision.skipped)) {
        setSubmitHint("Location created. Opening voice agent setup…");
      } else if (
        provision?.ok === false &&
        "skipped" in provision &&
        provision.skipped
      ) {
        setSubmitHint(
          "Location created. Voice agent auto-setup skipped — finish on Live Agent."
        );
      } else if (provision?.ok === true) {
        setSubmitHint("Location created. Voice agent is ready.");
      } else {
        setSubmitHint("Location created.");
      }

      const href = resolvePostCreateRestaurantHref(restaurant.id, provision);
      setOpen(false);
      setName("");
      setSubmitHint(null);
      router.refresh();
      router.push(href);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className={cn("btn-primary", className)}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        New restaurant
      </button>

      <Transition appear show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-base/80 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 translate-y-2 scale-[0.98]"
                enterTo="opacity-100 translate-y-0 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0 scale-100"
                leaveTo="opacity-0 translate-y-2 scale-[0.98]"
              >
                <Dialog.Panel className="glass-card w-full max-w-md p-6">
                  <Dialog.Title className="text-base font-semibold tracking-tight text-ink">
                    Create restaurant
                  </Dialog.Title>
                  <p className="mt-1 text-sm text-muted">
                    Give your restaurant a name. You can change it later.
                  </p>

                  {!gatesLoading ? (
                    <PlanLimitNotice verdict={locationGate} className="mt-4" />
                  ) : null}

                  <form onSubmit={onSubmit} className="mt-5 space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
                        Name
                      </label>
                      <input
                        autoFocus
                        type="text"
                        className="input-base"
                        placeholder="e.g. Lupa Trattoria"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isPending || locationGate?.hardBlocked}
                      />
                      {submitHint && isPending ? (
                        <p
                          className="mt-2 text-xs text-muted"
                          role="status"
                          aria-live="polite"
                        >
                          {submitHint}
                        </p>
                      ) : null}
                      {error && (
                        <p className="mt-2 text-xs text-danger" role="alert">
                          {error}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => setOpen(false)}
                        disabled={isPending}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={isPending || locationGate?.hardBlocked}
                      >
                        {isPending ? (
                          <>
                            <Spinner /> Creating…
                          </>
                        ) : (
                          "Create"
                        )}
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
