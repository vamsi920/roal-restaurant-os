import { ScanLine } from "lucide-react";
import type { RestaurantMenuSetupPageData } from "@/lib/restaurant-menu-setup/load-page-data";
import { PageHeader } from "@/components/ui";
import { CollapsiblePanel } from "@/components/live-orders/workspace-ui";
import { MenuAutoSyncStatusPanel } from "@/components/voice-agent/MenuAutoSyncStatusPanel";
import { MenuScanner } from "../MenuScanner";
import { MenuEditor } from "./MenuEditor";
import { MenuCopyFromLocation } from "./MenuCopyFromLocation";
import { MenuSetupCallIndicator } from "./MenuSetupCallIndicator";
import { MenuHashOpener, MenuJumpLink } from "./MenuHashOpener";

type Props = RestaurantMenuSetupPageData;

const HASH_SECTIONS = ["menu-scan", "menu-copy"] as const;

/**
 * Menu only: the menu board (categories + items, inline editing), one place to upload a new menu,
 * and copying from a sister location when there is one. Restaurant settings live on /settings.
 */
export function MenuSetupWorkspace({
  restaurant,
  menu,
  menuCopySources,
  menuTemplates,
  billingGates,
  profile,
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

      <CollapsiblePanel
        id="menu-scan"
        title="Add or update your menu"
        hint="Upload a photo, PDF or file of your menu. We read the items and prices; you check them before they go live."
        defaultOpen={menuEmpty}
      >
        <MenuScanner
          restaurantId={restaurant.id}
          menuScanGate={billingGates?.menu_scan ?? null}
          hidePanelHeader
        />
      </CollapsiblePanel>

      {menuCopySources.length > 0 ? (
        <CollapsiblePanel
          id="menu-copy"
          title="Copy from another location"
          hint="Use the menu from one of your other locations."
        >
          <MenuCopyFromLocation
            restaurantId={restaurant.id}
            sources={menuCopySources}
            templates={menuTemplates}
            inheritedTemplateId={restaurant.inherited_menu_template_id ?? null}
            inheritedTemplateAppliedAt={restaurant.inherited_menu_template_applied_at ?? null}
            inheritedTemplateOverrideCount={Number(restaurant.inherited_menu_template_override_count ?? 0)}
            inheritedTemplateLastLocalEditAt={restaurant.inherited_menu_template_last_local_edit_at ?? null}
          />
        </CollapsiblePanel>
      ) : null}
    </div>
  );
}
