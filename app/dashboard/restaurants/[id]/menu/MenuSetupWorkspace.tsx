import Link from "next/link";
import {
  RESTAURANT_LIVE_ORDERS_LABEL,
  RESTAURANT_MENU_AGENT_LABEL,
  RESTAURANT_MENU_SETUP_TITLE,
} from "@/lib/dashboard-restaurant-labels";
import type { RestaurantMenuSetupPageData } from "@/lib/restaurant-menu-setup/load-page-data";
import { MenuImportHistory } from "@/components/menu-import/MenuImportHistory";
import { LiveMenuSidebar } from "../LiveMenuSidebar";
import { MenuScanner } from "../MenuScanner";
import { RestaurantHoursSettings } from "../RestaurantHoursSettings";
import { RestaurantProfileSettings } from "../RestaurantProfileSettings";
import { MenuEditor } from "./MenuEditor";
import { MenuCopyFromLocation } from "./MenuCopyFromLocation";
import { MenuAutoSyncStatusPanel } from "@/components/voice-agent/MenuAutoSyncStatusPanel";
import { MenuSetupCallIndicator } from "./MenuSetupCallIndicator";

type Props = RestaurantMenuSetupPageData;

export function MenuSetupWorkspace({
  restaurant,
  menu,
  menuCopySources,
  menuTemplates,
  billingGates,
  profile,
  knowledgeBaseText,
  upsellRulesText,
  hoursBundle,
  voiceAgentCenter,
}: Props) {
  const categoryCount = menu.categories.length;
  const itemCount = menu.items.length;

  return (
    <div className="kds-workspace menu-setup menu-setup--guided max-w-full overflow-x-hidden">
      <nav
        aria-label="Location"
        className="menu-setup-crumb hidden min-w-0 items-center gap-2 overflow-x-auto text-sm sm:flex"
      >
        <Link href="/dashboard/restaurants" className="shrink-0 text-muted hover:text-ink">
          Locations
        </Link>
        <span className="shrink-0 text-subtle">/</span>
        <Link
          href={`/dashboard/restaurants/${restaurant.id}`}
          className="shrink-0 truncate text-muted hover:text-ink"
        >
          {restaurant.name}
        </Link>
        <span className="shrink-0 text-subtle">/</span>
        <span aria-current="page" className="truncate font-medium text-ink">
          {RESTAURANT_MENU_AGENT_LABEL}
        </span>
      </nav>

      <header className="menu-setup-header flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-2xl">
          <h1 id="menu-setup-page-heading" className="text-balance text-ink">
            {RESTAURANT_MENU_SETUP_TITLE}
          </h1>
          <p className="mt-2 text-pretty text-sm text-muted sm:text-base">
            Upload a menu photo, then review and edit the live menu.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Link
            href={`/dashboard/restaurants/${restaurant.id}/agent`}
            className="btn-ghost kds-thumb-btn min-h-12 w-full text-center text-sm sm:w-auto"
          >
            Live Agent
          </Link>
          <Link
            href={`/dashboard/restaurants/${restaurant.id}`}
            className="btn-primary kds-thumb-btn min-h-12 w-full shrink-0 text-center text-sm sm:w-auto"
          >
            {RESTAURANT_LIVE_ORDERS_LABEL}
          </Link>
        </div>
      </header>

      <MenuAutoSyncStatusPanel
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        initial={voiceAgentCenter.menuAutoSync}
        voiceOrderGate={billingGates?.voice_order ?? null}
      />

      <div className="menu-setup-primary min-w-0">
        <nav aria-label="Setup progress" className="menu-setup-progress">
          <ol className="menu-setup-progress__list">
            <li className="menu-setup-progress__item">
              <span className="menu-setup-progress__n" aria-hidden>
                1
              </span>
              <span>Upload photo</span>
            </li>
            <li className="menu-setup-progress__item">
              <span className="menu-setup-progress__n" aria-hidden>
                2
              </span>
              <span>Live menu</span>
            </li>
            <li className="menu-setup-progress__item menu-setup-progress__item--optional">
              <span className="menu-setup-progress__n" aria-hidden>
                3
              </span>
              <span>Optional edits</span>
            </li>
          </ol>
        </nav>

        <div className="menu-setup-primary__grid">
          <section
            className="menu-setup-panel menu-setup-panel--upload kds-panel glass-card overflow-hidden"
            aria-labelledby="menu-setup-upload-heading"
          >
            <div className="kds-panel__header">
              <div className="min-w-0">
                <p className="menu-setup-panel__step text-micro font-semibold uppercase tracking-wide text-accent">
                  Step 1
                </p>
                <h2 id="menu-setup-upload-heading" className="kds-panel__title">
                  Upload menu photo
                </h2>
                <p className="kds-panel__lead">
                  Upload, review, then commit to your live menu.
                </p>
              </div>
            </div>
            <div className="p-4 sm:p-5">
              <div id="menu-scan">
                <MenuScanner
                  restaurantId={restaurant.id}
                  menuScanGate={billingGates?.menu_scan ?? null}
                  hidePanelHeader
                />
              </div>
            </div>
          </section>

          <section
            id="menu-live"
            className="menu-setup-panel menu-setup-panel--live kds-panel glass-card overflow-hidden"
            aria-labelledby="menu-setup-live-heading"
          >
            <div className="kds-panel__header">
              <div className="min-w-0">
                <p className="menu-setup-panel__step text-micro font-semibold uppercase tracking-wide text-accent">
                  Step 2
                </p>
                <h2 id="menu-setup-live-heading" className="kds-panel__title">
                  Live menu
                </h2>
                <p className="kds-panel__lead">
                  {categoryCount} categories · {itemCount} items — updates as you
                  scan or edit.
                </p>
              </div>
            </div>
            <div className="space-y-3 p-4 sm:p-5">
              <MenuSetupCallIndicator restaurantId={restaurant.id} />
              <LiveMenuSidebar
                restaurantId={restaurant.id}
                initialCategories={menu.categories}
                initialItems={menu.items}
                initialModifiers={menu.modifiers}
                hidePanelHeader
              />
            </div>
          </section>
        </div>

        <p className="menu-setup-primary__hint text-sm text-muted sm:hidden">
          After you commit a scan, check step 2 to confirm categories and items
          look right.
        </p>
      </div>

      <div className="menu-setup-more">
        <p className="menu-setup-more__label">Optional</p>
        <details className="menu-setup-more__block">
          <summary className="menu-setup-more__summary">
            Edit menu by hand
          </summary>
          <div className="menu-setup-more__body">
            <h2 id="menu-setup-manual-editor-heading" className="sr-only">
              Manual menu editor
            </h2>
            <MenuEditor
              restaurantId={restaurant.id}
              restaurantName={restaurant.name}
              initial={menu}
              embedded
              hideSectionHeader
            />
          </div>
        </details>

        <details className="menu-setup-more__block">
          <summary className="menu-setup-more__summary">
            Copy menu from another location
          </summary>
          <div className="menu-setup-more__body">
            <h2 id="menu-setup-copy-heading" className="sr-only">
              Copy menu from another location
            </h2>
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
          </div>
        </details>

        <details className="menu-setup-more__block">
          <summary className="menu-setup-more__summary">
            Menu upload history
          </summary>
          <div className="menu-setup-more__body">
            <h2 id="menu-setup-import-heading" className="sr-only">
              Recent menu imports
            </h2>
            <MenuImportHistory restaurantId={restaurant.id} hidePanelHeader />
          </div>
        </details>

        <details
          className="menu-setup-restaurant-basics menu-setup-more__block"
          aria-labelledby="menu-setup-basics-summary"
        >
          <summary
            id="menu-setup-basics-summary"
            className="menu-setup-more__summary menu-setup-restaurant-basics__summary"
          >
            Restaurant basics
          </summary>
          <p className="menu-setup-restaurant-basics__lead menu-setup-more__lead">
            Location name, address, hours, and fees — update when your store
            details change.
          </p>
          <div className="menu-setup-more__body menu-setup-more__body--basics">
            <RestaurantProfileSettings
              restaurant={restaurant}
              profile={profile}
              knowledgeBaseText={knowledgeBaseText}
              upsellRulesText={upsellRulesText}
            />
            {hoursBundle ? (
              <RestaurantHoursSettings
                restaurantId={restaurant.id}
                bundle={hoursBundle}
              />
            ) : null}
          </div>
        </details>
      </div>
    </div>
  );
}
