import { ScanLine } from "lucide-react";
import type { RestaurantMenuSetupPageData } from "@/lib/restaurant-menu-setup/load-page-data";
import { PageHeader } from "@/components/ui";
import { CollapsiblePanel } from "@/components/live-orders/workspace-ui";
import { MenuImportHistory } from "@/components/menu-import/MenuImportHistory";
import { MenuAutoSyncStatusPanel } from "@/components/voice-agent/MenuAutoSyncStatusPanel";
import { MenuScanner } from "../MenuScanner";
import { RestaurantHoursSettings } from "../RestaurantHoursSettings";
import { RestaurantProfileSettings } from "../RestaurantProfileSettings";
import { MenuEditor } from "./MenuEditor";
import { MenuCopyFromLocation } from "./MenuCopyFromLocation";
import { MenuSetupCallIndicator } from "./MenuSetupCallIndicator";
import { MenuHashOpener, MenuJumpLink } from "./MenuHashOpener";

type Props = RestaurantMenuSetupPageData;

const HASH_SECTIONS = ["menu-scan", "menu-copy", "menu-import-history", "restaurant-settings"] as const;

/**
 * Menu module: PageHeader → menu board (categories + items, inline editing) →
 * import tools (scan, copy, history) → restaurant settings (#restaurant-settings).
 * Navigation chrome lives in the global sidebar, not here.
 */
export function MenuSetupWorkspace({
  restaurant,
  menu,
  menuCopySources,
  menuTemplates,
  billingGates,
  profile,
  knowledgeEntries,
  upsellRules,
  hoursBundle,
  voiceAgentCenter,
}: Props) {
  const categoryCount = menu.categories.length;
  const itemCount = menu.items.length;
  const hostName = profile.agent_display_name?.trim() || "your phone host";
  const menuEmpty = itemCount === 0;

  return (
    <div className="menu-setup mx-auto w-full min-w-0 max-w-[1200px] space-y-8">
      <MenuHashOpener ids={HASH_SECTIONS} />

      <div>
        <PageHeader
          title="Menu"
          subtitle={
            <span className="block truncate">
              {categoryCount} {categoryCount === 1 ? "category" : "categories"} · {itemCount}{" "}
              {itemCount === 1 ? "item" : "items"} · what {hostName} reads from when guests order
            </span>
          }
          className="[&>div:first-child]:max-w-full"
          actions={
            <>
              <MenuSetupCallIndicator restaurantId={restaurant.id} />
              <MenuJumpLink target="menu-scan">
                <ScanLine size={15} aria-hidden /> Scan a menu
              </MenuJumpLink>
              <MenuAutoSyncStatusPanel
                variant="header"
                restaurantId={restaurant.id}
                restaurantName={restaurant.name}
                initial={voiceAgentCenter.menuAutoSync}
                voiceOrderGate={billingGates?.voice_order ?? null}
              />
            </>
          }
        />

        <section id="menu-live" aria-label="Live menu" className="scroll-mt-24">
          <MenuEditor
            restaurantId={restaurant.id}
            restaurantName={restaurant.name}
            initial={menu}
            embedded
            hideSectionHeader
            scanHref="#menu-scan"
          />
        </section>
      </div>

      <section aria-labelledby="menu-tools-heading" className="space-y-3">
        <div>
          <h2 id="menu-tools-heading" className="font-display text-[18px] font-bold tracking-[-0.01em] text-ink">
            Import &amp; copy
          </h2>
          <p className="mt-0.5 text-[13px] text-subtle">
            Bring a menu in from a photo or another location. Everything lands in the board above.
          </p>
        </div>

        <CollapsiblePanel
          id="menu-scan"
          title="Upload menu photo"
          hint="We read items, prices and options — you review before anything goes live."
          defaultOpen={menuEmpty}
        >
          <MenuScanner
            restaurantId={restaurant.id}
            menuScanGate={billingGates?.menu_scan ?? null}
            hidePanelHeader
          />
        </CollapsiblePanel>

        <CollapsiblePanel
          id="menu-copy"
          title="Copy from another location"
          hint="Reuse a brand template or copy a sister location's menu."
        >
          <MenuCopyFromLocation
            restaurantId={restaurant.id}
            sources={menuCopySources}
            templates={menuTemplates}
            inheritedTemplateId={restaurant.inherited_menu_template_id ?? null}
            inheritedTemplateAppliedAt={restaurant.inherited_menu_template_applied_at ?? null}
            inheritedTemplateOverrideCount={Number(
              restaurant.inherited_menu_template_override_count ?? 0
            )}
            inheritedTemplateLastLocalEditAt={
              restaurant.inherited_menu_template_last_local_edit_at ?? null
            }
          />
        </CollapsiblePanel>

        <CollapsiblePanel
          id="menu-import-history"
          title="Import history"
          hint="Every scan and save, for your team's records."
        >
          <MenuImportHistory restaurantId={restaurant.id} hidePanelHeader />
        </CollapsiblePanel>
      </section>

      <section
        id="restaurant-settings"
        aria-labelledby="restaurant-settings-heading"
        className="scroll-mt-24 space-y-4"
      >
        <div>
          <h2
            id="restaurant-settings-heading"
            className="font-display text-[18px] font-bold tracking-[-0.01em] text-ink"
          >
            Restaurant settings
          </h2>
          <p className="mt-0.5 text-[13px] text-subtle">
            What {hostName} tells guests about your location — details, hours, FAQs, upsells and handoff.
          </p>
        </div>
        <RestaurantProfileSettings
          restaurant={restaurant}
          profile={profile}
          knowledgeEntries={knowledgeEntries}
          upsellRules={upsellRules}
          menu={menu}
          hoursSlot={
            hoursBundle ? (
              <RestaurantHoursSettings restaurantId={restaurant.id} bundle={hoursBundle} />
            ) : null
          }
        />
      </section>
    </div>
  );
}
