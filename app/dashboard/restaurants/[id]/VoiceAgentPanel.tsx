"use client";

import { useState } from "react";
import { connectElevenLabsAgentToRestaurantAction } from "./elevenlabs-actions";

type Props = {
  supabaseRef: string | null;
  edgeBase: string;
  restaurantId: string;
  restaurantName: string;
};

export function VoiceAgentPanel({
  supabaseRef,
  edgeBase,
  restaurantId,
  restaurantName,
}: Props) {
  const [agentId, setAgentId] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toolUrls = supabaseRef
    ? {
        get_menu: `${edgeBase}/functions/v1/get-menu?restaurant_id=${restaurantId}&restaurant_name=${encodeURIComponent(restaurantName)}`,
        sync_draft: `${edgeBase}/functions/v1/sync-draft-order`,
        finalize: `${edgeBase}/functions/v1/finalize-order`,
      }
    : null;

  return (
    <section className="glass-card overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-sm font-semibold">ElevenLabs</h2>
        <p className="mt-0.5 text-xs text-muted">
          Paste your Conv AI agent id and connect once: ROAL syncs Supabase tools,
          applies the order-taker prompt, and sets this page&apos;s{" "}
          <span className="font-medium text-ink">restaurant_id</span> /{" "}
          <span className="font-medium text-ink">restaurant_name</span> as the
          agent&apos;s default dynamic variables. Needs keys in{" "}
          <code className="rounded bg-elev px-1 text-[11px]">.env</code> (copy from{" "}
          <code className="rounded bg-elev px-1 text-[11px]">.env.example</code>).
        </p>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            className="input-base min-w-[200px] flex-1"
            placeholder="ElevenLabs agent id"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
          />
          <button
            type="button"
            className="btn-primary"
            disabled={connecting}
            onClick={async () => {
              setError(null);
              setResult(null);
              setConnecting(true);
              try {
                const { sync, profile } =
                  await connectElevenLabsAgentToRestaurantAction({
                    agentId,
                    restaurantId,
                    restaurantName,
                  });
                const toolsLine = `${sync.tools.map((t) => `${t.name}: ${t.op}`).join(" · ")} · tool_ids: ${sync.tool_ids_on_agent.length}`;
                const defaults =
                  sync.restaurant_placeholders_updated ||
                  profile.restaurant_placeholders_updated
                    ? ` · restaurant defaults → ${restaurantName}`
                    : "";
                setResult(
                  `${toolsLine}${defaults} · profile · KB: ${profile.knowledge_base_doc_attached ? "linked" : "unchanged"} · tools baked for phone: ${sync.restaurant_tools_baked ? "yes" : "no"}`
                );
              } catch (e) {
                setError(e instanceof Error ? e.message : "Connect failed");
              } finally {
                setConnecting(false);
              }
            }}
          >
            {connecting ? "Connecting…" : "Connect agent to this restaurant"}
          </button>
        </div>

        {toolUrls && (
          <div className="rounded-xl border border-line bg-elev p-4 text-xs shadow-sm">
            <p className="font-medium text-ink">Server tool base URLs (this restaurant)</p>
            <ul className="mt-2 space-y-2 break-all text-muted">
              <li>
                <span className="text-subtle">get_menu_items → </span>
                {toolUrls.get_menu}
              </li>
              <li>
                <span className="text-subtle">sync_draft_order → </span>
                {toolUrls.sync_draft}
              </li>
              <li>
                <span className="text-subtle">finalize_order → </span>
                {toolUrls.finalize}
              </li>
            </ul>
          </div>
        )}

        {!supabaseRef && (
          <p className="text-xs text-danger">
            Set NEXT_PUBLIC_SUPABASE_URL so tool URLs can be shown.
          </p>
        )}

        {result && <p className="text-xs text-accent">{result}</p>}
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    </section>
  );
}
