import { ScannedMenuSchema, type ScannedMenu } from "@/lib/menu-import/types";
import { findRestaurantViaWebSearch, scanMenuImage } from "@/lib/ai";
import { hasGooglePlacesApiKey } from "@/lib/env.server";
import { deepMenuSearch } from "@/lib/restaurant-lookup/deep-menu-search";
import { importWebsiteMenuFromUrl } from "@/lib/restaurant-lookup/import-website-menu";
import {
  getRestaurantPlaceSnapshot,
  searchRestaurantPlaces,
} from "@/lib/restaurant-lookup/places";
import { scannedMenuHasPricedItems } from "@/lib/restaurant-lookup/priced-menu";
import type { PlaceSnapshot } from "@/lib/restaurant-lookup/types";
import type { ParsedTrialInput } from "@/lib/trial/input";
import { buildTrialAgentPrompt, buildTrialGreeting } from "@/lib/trial/prompt";
import { buildSampleMenu } from "@/lib/trial/sample-menu";
import { getTrial, updateTrial, upsertStep } from "@/lib/trial/store";
import type { TrialKnowledgeEntry, TrialProfile, TrialRecord } from "@/lib/trial/types";
import { resolveTrialPersona } from "@/lib/trial/voices";
import {
  buildProfileFromWebsite,
  profileFromExtracted,
  weeklyHoursFromExtracted,
} from "@/lib/trial/website-profile";

function profileFromSnapshot(snapshot: PlaceSnapshot): TrialProfile {
  return { ...snapshot.profile, cuisine: null, tagline: null };
}

function mergeProfiles(primary: TrialProfile, fallback: TrialProfile | null): TrialProfile {
  if (!fallback) return primary;
  return {
    name: primary.name || fallback.name,
    phone: primary.phone ?? fallback.phone,
    address_line1: primary.address_line1 ?? fallback.address_line1,
    address_line2: primary.address_line2 ?? fallback.address_line2,
    city: primary.city ?? fallback.city,
    region: primary.region ?? fallback.region,
    postal_code: primary.postal_code ?? fallback.postal_code,
    country: primary.country || fallback.country,
    timezone: primary.timezone || fallback.timezone,
    website: primary.website ?? fallback.website,
    cuisine: primary.cuisine ?? fallback.cuisine,
    tagline: primary.tagline ?? fallback.tagline,
  };
}

async function placesLookup(query: string, city: string | null): Promise<PlaceSnapshot | null> {
  if (!hasGooglePlacesApiKey()) return null;
  try {
    const candidates = await searchRestaurantPlaces(query, city ?? "");
    const first = candidates[0];
    if (!first) return null;
    return await getRestaurantPlaceSnapshot(first.place_id, first.name);
  } catch (e) {
    console.error("[trial places]", e instanceof Error ? e.message : e);
    return null;
  }
}

const compact = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

/** "dosahutnewjersey" from https://www.dosahutnewjersey.com/ */
export function domainLabel(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const label = host.split(".")[0];
    return label && label.length >= 3 ? label : null;
  } catch {
    return null;
  }
}

/** Only trust a Google match whose name is clearly the same business as the domain. */
export function placeMatchesDomain(placeName: string, label: string): boolean {
  const name = compact(placeName.replace(/^the\s+/i, ""));
  const domain = compact(label);
  if (name.length < 3) return false;
  if (domain.includes(name) || name.includes(domain)) return true;
  const lead = compact(placeName.replace(/^the\s+/i, "").split(/[-–|(,]/)[0] ?? "");
  return lead.length >= 5 && domain.includes(lead);
}

async function placesLookupByDomain(url: string): Promise<PlaceSnapshot | null> {
  if (!hasGooglePlacesApiKey()) return null;
  const label = domainLabel(url);
  if (!label) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const candidates = await searchRestaurantPlaces(host, "");
    const match = candidates.find((c) => placeMatchesDomain(c.name, label));
    if (!match) return null;
    return await getRestaurantPlaceSnapshot(match.place_id, match.name);
  } catch (e) {
    console.error("[trial places by domain]", e instanceof Error ? e.message : e);
    return null;
  }
}

const WEB_SEARCH_LOOKUP_BUDGET_MS = 14_000;

function titleFromDomainLabel(label: string): string {
  return label.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function emptyProfile(name: string, website: string | null, city: string | null): TrialProfile {
  return {
    name,
    phone: null,
    address_line1: null,
    address_line2: null,
    city,
    region: null,
    postal_code: null,
    country: "US",
    timezone: "America/New_York",
    website,
    cuisine: null,
    tagline: null,
  };
}

/** Fallback when neither the website nor Google Places gave us the restaurant. Always returns a profile. */
export async function lookupWithoutListing(
  parsed: ParsedTrialInput,
  search: typeof findRestaurantViaWebSearch = findRestaurantViaWebSearch
): Promise<{ profile: TrialProfile; weeklyHours: TrialRecord["weekly_hours"]; detail: string }> {
  const website = parsed.kind === "website" ? parsed.url : null;
  const hint =
    parsed.kind === "website"
      ? `the restaurant whose website is ${parsed.url}`
      : parsed.kind === "maps"
        ? `${parsed.query ?? ""} (Google Maps link ${parsed.url})`.trim()
        : [parsed.name, parsed.city].filter(Boolean).join(", ");

  try {
    const found = await Promise.race([
      search(hint),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), WEB_SEARCH_LOOKUP_BUDGET_MS)),
    ]);
    if (found) {
      const profile = profileFromExtracted(found, website ?? "");
      return {
        profile: { ...profile, website },
        weeklyHours: weeklyHoursFromExtracted(found.weekly_hours),
        detail: `Found ${profile.name}${profile.city ? ` in ${profile.city}` : ""} on the web`,
      };
    }
  } catch (e) {
    console.error("[trial web lookup]", e instanceof Error ? e.message.slice(0, 200) : e);
  }

  const label = website ? domainLabel(website) : null;
  const name =
    parsed.kind === "name_city"
      ? parsed.name
      : parsed.kind === "maps" && parsed.query
        ? parsed.query
        : label
          ? titleFromDomainLabel(label)
          : "Your restaurant";
  return {
    profile: emptyProfile(name, website, parsed.kind === "name_city" ? parsed.city : null),
    weeklyHours: null,
    detail: "Starting from your link. You can add hours and details in the next steps.",
  };
}

/** Netlify cuts synchronous functions off at 30s; stop waiting on the importer well before that. */
const MENU_IMPORT_BUDGET_MS = 22_000;

async function importMenuWithinBudget(url: string) {
  return Promise.race([
    importWebsiteMenuFromUrl(url),
    new Promise<{ ok: false; message: string }>((resolve) =>
      setTimeout(() => resolve({ ok: false, message: "Reading the website menu took too long." }), MENU_IMPORT_BUDGET_MS)
    ),
  ]);
}

/** The deep pass runs as its own request, so it gets most of a fresh function budget. */
const DEEP_MENU_BUDGET_MS = 25_000;

async function deepMenuWithinBudget(trial: TrialRecord) {
  return Promise.race([
    deepMenuSearch({
      name: trial.restaurant_name ?? trial.profile?.name ?? trial.source_input,
      website: trial.profile?.website ?? null,
      address: trial.profile?.address_line1 ?? null,
      city: trial.profile?.city ?? null,
      region: trial.profile?.region ?? null,
    }),
    new Promise<{ ok: false; message: string; tried: number }>((resolve) =>
      setTimeout(() => resolve({ ok: false, message: "Searching for your menu took too long.", tried: 0 }), DEEP_MENU_BUDGET_MS)
    ),
  ]);
}

/**
 * Step 2b: the site had no priced menu, so look everywhere else (web search, PDFs, photos).
 * Leaves the current (sample) menu in place when nothing better turns up.
 */
export async function deepSearchTrialMenu(trialId: string): Promise<TrialRecord> {
  const existing = await getTrial(trialId);
  if (!existing) throw new Error("Trial not found");
  const trial = await updateTrial(trialId, {
    step_log: upsertStep(existing.step_log, {
      id: "menu",
      status: "running",
      title: "Searching the web for your menu",
    }),
  });

  const found = await deepMenuWithinBudget(trial);
  if (found.ok) {
    const where = new URL(found.sourceUrl).hostname.replace(/^www\./, "");
    const kind = found.via === "pdf" ? "menu PDF" : found.via === "image" ? "menu photo" : "online menu";
    return updateTrial(trialId, {
      menu: found.menu,
      menu_source: "web_search",
      menu_source_url: found.sourceUrl,
      step_log: upsertStep(trial.step_log, {
        id: "menu",
        status: "done",
        title: "Menu loaded",
        detail: `Found ${found.itemCount} priced items in your ${kind} on ${where}`,
      }),
    });
  }

  const fallback = trial.menu ?? buildSampleMenu(
    [trial.profile?.cuisine, trial.restaurant_name, trial.profile?.name].filter(Boolean).join(" ")
  );
  return updateTrial(trialId, {
    menu: fallback,
    menu_source: trial.menu_source ?? "sample",
    step_log: upsertStep(trial.step_log, {
      id: "menu",
      status: "skipped",
      title: "Sample menu loaded",
      detail: `${found.message} Using a sample menu for the test call.`,
    }),
  });
}

export type ResolveListingResult = { ok: true; trial: TrialRecord } | { ok: false; trial: TrialRecord; message: string };

/** Step 1: turn the raw link / name into a profile + hours + seed knowledge. */
export async function resolveTrialListing(
  trialId: string,
  parsed: ParsedTrialInput
): Promise<ResolveListingResult> {
  const existing = await getTrial(trialId);
  if (!existing) throw new Error("Trial not found");

  const trial: TrialRecord = await updateTrial(trialId, {
    step_log: upsertStep(existing.step_log, {
      id: "listing",
      status: "running",
      title: "Finding your restaurant",
    }),
  });

  let profile: TrialProfile | null = null;
  let weeklyHours = null as TrialRecord["weekly_hours"];
  let knowledge: TrialKnowledgeEntry[] = [];
  let placeId: string | null = null;
  let offersDelivery = false;
  let detail = "";
  let failure: string | null = null;

  if (parsed.kind === "website") {
    const site = await buildProfileFromWebsite(parsed.url);
    if (site.ok) {
      profile = site.profile;
      weeklyHours = site.weeklyHours;
      knowledge = site.knowledge;
      offersDelivery = site.offersDelivery;
      const snapshot = await placesLookup(site.profile.name, site.profile.city);
      if (snapshot) {
        placeId = snapshot.place_id;
        profile = mergeProfiles(profile, profileFromSnapshot(snapshot));
        if (!weeklyHours && snapshot.weekly_hours) weeklyHours = snapshot.weekly_hours;
      }
      detail = `Read ${site.fetchedUrls.length} page${site.fetchedUrls.length === 1 ? "" : "s"} from ${new URL(parsed.url).hostname}`;
    } else {
      // Some sites block automated visitors (bot checkpoints). Find the same place on Google instead.
      const snapshot = site.reason === "not_restaurant" ? null : await placesLookupByDomain(parsed.url);
      if (snapshot) {
        placeId = snapshot.place_id;
        profile = { ...profileFromSnapshot(snapshot), website: snapshot.profile.website ?? parsed.url };
        weeklyHours = snapshot.weekly_hours;
        detail = `Matched the Google listing for ${profile.name}`;
      } else {
        failure = site.message;
      }
    }
  } else if (parsed.kind === "maps") {
    const query = parsed.query;
    const snapshot = query ? await placesLookup(query, null) : null;
    if (snapshot) {
      placeId = snapshot.place_id;
      profile = profileFromSnapshot(snapshot);
      weeklyHours = snapshot.weekly_hours;
      detail = `Matched the Google listing for ${profile.name}`;
      if (profile.website) {
        const site = await buildProfileFromWebsite(profile.website);
        if (site.ok) {
          profile = mergeProfiles(site.profile, profile);
          weeklyHours = weeklyHours ?? site.weeklyHours;
          knowledge = site.knowledge;
          offersDelivery = site.offersDelivery;
        }
      }
    } else if (query && !hasGooglePlacesApiKey()) {
      failure = "Google Maps links need the Places lookup, which is not enabled here. Paste the restaurant website instead.";
    } else {
      failure = "We could not match that Google Maps link. Paste the restaurant website instead.";
    }
  } else {
    const snapshot = await placesLookup(parsed.name, parsed.city);
    if (snapshot) {
      placeId = snapshot.place_id;
      profile = profileFromSnapshot(snapshot);
      weeklyHours = snapshot.weekly_hours;
      detail = `Matched ${profile.name}${profile.city ? ` in ${profile.city}` : ""}`;
      if (profile.website) {
        const site = await buildProfileFromWebsite(profile.website);
        if (site.ok) {
          profile = mergeProfiles(site.profile, profile);
          weeklyHours = weeklyHours ?? site.weeklyHours;
          knowledge = site.knowledge;
          offersDelivery = site.offersDelivery;
        }
      }
    } else if (!hasGooglePlacesApiKey()) {
      failure = "Name search is not enabled here. Paste the restaurant website link instead.";
    } else {
      failure = "We could not find that restaurant. Try the website link, or add the city.";
    }
  }

  // Never leave an owner stuck on step one: search the web, and failing that start from what they typed.
  const notRestaurant = parsed.kind === "website" && failure?.includes("does not look like a restaurant");
  if (!profile && !notRestaurant) {
    const found = await lookupWithoutListing(parsed);
    profile = found.profile;
    weeklyHours = weeklyHours ?? found.weeklyHours;
    detail = found.detail;
    failure = null;
  }

  if (!profile || failure) {
    const updated = await updateTrial(trialId, {
      status: "failed",
      error: failure ?? "Could not resolve the restaurant.",
      step_log: upsertStep(trial.step_log, {
        id: "listing",
        status: "failed",
        title: "Finding your restaurant",
        detail: failure ?? "Could not resolve the restaurant.",
      }),
    });
    return { ok: false, trial: updated, message: failure ?? "Could not resolve the restaurant." };
  }

  const updated = await updateTrial(trialId, {
    restaurant_name: profile.name,
    profile,
    weekly_hours: weeklyHours,
    knowledge,
    place_id: placeId,
    persona: { ...trial.persona, offersDelivery },
    error: null,
    step_log: upsertStep(trial.step_log, {
      id: "listing",
      status: "done",
      title: "Found your restaurant",
      detail: detail || null,
    }),
  });
  return { ok: true, trial: updated };
}

/** Step 2: import the menu from the website (or a menu URL / image), else fall back to a sample. */
export async function resolveTrialMenu(
  trialId: string,
  options?: { menuUrl?: string | null; image?: { base64: string; mimeType: string } | null }
): Promise<TrialRecord> {
  const existing = await getTrial(trialId);
  if (!existing) throw new Error("Trial not found");

  const trial: TrialRecord = await updateTrial(trialId, {
    step_log: upsertStep(existing.step_log, {
      id: "menu",
      status: "running",
      title: "Reading your menu",
    }),
  });

  let menu: ScannedMenu | null = null;
  let source: TrialRecord["menu_source"] = null;
  let sourceUrl: string | null = null;
  let detail = "";

  if (options?.image) {
    try {
      const scan = await scanMenuImage(options.image.base64, options.image.mimeType);
      const parsed = ScannedMenuSchema.safeParse(scan.data);
      if (parsed.success && scannedMenuHasPricedItems(parsed.data)) {
        menu = parsed.data;
        source = "upload";
        detail = "Scanned your menu photo";
      } else {
        detail = "Could not read prices from that photo";
      }
    } catch (e) {
      detail = e instanceof Error ? e.message : "Photo scan failed";
    }
  }

  if (!menu) {
    const candidate = options?.menuUrl?.trim() || trial.profile?.website || null;
    if (candidate) {
      const imported = await importMenuWithinBudget(candidate);
      if (imported.ok) {
        menu = imported.menu;
        source = options?.menuUrl?.trim() ? "menu_url" : "website";
        sourceUrl = imported.sourceUrl;
        const count = menu.categories.reduce((n, c) => n + c.items.length, 0);
        detail = `Found ${count} items on ${new URL(imported.sourceUrl).hostname}`;
      } else if (!detail) {
        detail = imported.message;
      }
    }
  }

  let status: "done" | "skipped" = "done";
  if (!menu) {
    menu = buildSampleMenu(
      [trial.profile?.cuisine, trial.restaurant_name, trial.profile?.name].filter(Boolean).join(" ")
    );
    source = "sample";
    status = "skipped";
    detail = detail
      ? `${detail} Using a sample menu for the test call.`
      : "No public menu found. Using a sample menu for the test call.";
  }

  return updateTrial(trialId, {
    menu,
    menu_source: source,
    menu_source_url: sourceUrl,
    step_log: upsertStep(trial.step_log, {
      id: "menu",
      status,
      title: status === "done" ? "Menu loaded" : "Sample menu loaded",
      detail,
    }),
  });
}

/** Step 3: compose the prompt + greeting and mark the trial ready. */
export async function composeTrialAgent(trialId: string): Promise<TrialRecord> {
  const trial = await getTrial(trialId);
  if (!trial) throw new Error("Trial not found");
  const name = trial.restaurant_name ?? trial.profile?.name ?? "Your restaurant";
  const persona = resolveTrialPersona(trial.persona, name, trial.profile?.cuisine);
  const offersDelivery = Boolean((trial.persona as { offersDelivery?: boolean }).offersDelivery);

  // The menu step can fail outright (timeout, network); never put a menu-less agent on the line.
  let stepLog = trial.step_log;
  if (!trial.menu) {
    stepLog = upsertStep(stepLog, {
      id: "menu",
      status: "skipped",
      title: "Sample menu loaded",
      detail: "Could not read the website menu in time. Using a sample menu for the test call.",
    });
    trial.menu = buildSampleMenu(
      [trial.profile?.cuisine, trial.restaurant_name, trial.profile?.name].filter(Boolean).join(" ")
    );
    trial.menu_source = "sample";
  }

  const prompt = buildTrialAgentPrompt({
    restaurantName: name,
    profile: trial.profile,
    weeklyHours: trial.weekly_hours,
    menu: trial.menu,
    menuIsSample: trial.menu_source === "sample",
    knowledge: trial.knowledge,
    persona,
    offersDelivery,
  });
  const greeting = buildTrialGreeting({ restaurantName: name, persona, offersDelivery });

  const itemCount = trial.menu
    ? trial.menu.categories.reduce((n, c) => n + c.items.length, 0)
    : 0;
  const facts = [
    itemCount ? `${itemCount} menu items` : null,
    trial.weekly_hours ? "hours" : null,
    trial.profile?.address_line1 ? "address" : null,
    trial.knowledge.length ? `${trial.knowledge.length} FAQs` : null,
  ].filter(Boolean);

  return updateTrial(trialId, {
    menu: trial.menu,
    menu_source: trial.menu_source,
    prompt,
    greeting,
    status: "ready",
    error: null,
    step_log: upsertStep(stepLog, {
      id: "agent",
      status: "done",
      title: `${persona.agentName} is ready to take calls`,
      detail: facts.length ? `Knows ${facts.join(", ")}` : null,
    }),
  });
}

/** Re-compose after persona / knowledge edits (cheap, no network). */
export async function recomposeTrialAgent(trialId: string): Promise<TrialRecord> {
  return composeTrialAgent(trialId);
}
