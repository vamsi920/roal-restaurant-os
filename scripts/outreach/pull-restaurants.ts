/**
 * Pulls every operating restaurant / food place in Jersey City and Hoboken from Google Places (New)
 * and writes leads/restaurants.json + .csv. Built to stay inside the free monthly allowance and to
 * resume where it stopped, so it can be run again next month to finish.
 *
 * Two phases, each its own Google SKU with its own free monthly cap:
 *  1. Text Search with Pro fields only (name, address, types): free up to 5,000 requests a month.
 *     It searches a grid over both cities; any cell that comes back full (60, the API max) is split
 *     into four and searched again, so dense blocks are not cut off.
 *  2. Place Details with Enterprise fields (phone, website, rating) for the places that pass the
 *     city/food filter: free up to 1,000 a month.
 *
 * Every request is counted per calendar month in leads/pull-state.json and the script stops before a
 * budget is reached. State is saved after every cell and every details call, and the output files are
 * written even when it stops early, so a crash or a cut-off never loses paid work.
 *
 *   npm run outreach:pull
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { toCsv } from "./csv";

const KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!KEY) throw new Error("GOOGLE_PLACES_API_KEY missing");

// Stay under Google's free caps (5,000 Pro searches, 1,000 Enterprise details) with room for the app's own use.
const SEARCH_BUDGET = Number(process.env.SEARCH_BUDGET ?? 4500);
const DETAILS_BUDGET = Number(process.env.DETAILS_BUDGET ?? 900);

const STATE_FILE = "leads/pull-state.json";
const CITIES = new Set(["Jersey City", "Hoboken"]);

// Box that covers all of Jersey City + Hoboken (results are filtered by city afterwards).
const AREA = { south: 40.66, west: -74.125, north: 40.772, east: -74.018 };
const START_STEP = 0.014; // ~1.5 km cells
const MIN_STEP = 0.0025;

// Several phrasings, because one query alone ranks some kinds of places out.
const QUERIES = ["restaurant", "takeout food", "pizza", "deli", "cafe", "bakery", "bar and grill"];

const SEARCH_FIELDS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.googleMapsUri",
  "places.primaryType",
  "places.primaryTypeDisplayName",
  "places.types",
  "places.businessStatus",
  "nextPageToken",
].join(",");
const DETAILS_FIELDS = "nationalPhoneNumber,websiteUri,rating,userRatingCount";

type Place = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  addressComponents?: { longText?: string; types?: string[] }[];
  googleMapsUri?: string;
  primaryType?: string;
  primaryTypeDisplayName?: { text?: string };
  types?: string[];
  businessStatus?: string;
};
type Details = { nationalPhoneNumber?: string; websiteUri?: string; rating?: number; userRatingCount?: number };
type Box = { south: number; west: number; north: number; east: number };
type State = {
  month: string;
  used: { search: number; details: number };
  queue: { query: string; box: Box }[] | null; // null = search not started yet
  places: Record<string, Place>;
  details: Record<string, Details>;
};

const month = new Date().toISOString().slice(0, 7);

function loadState(): State {
  const fresh: State = { month, used: { search: 0, details: 0 }, queue: null, places: {}, details: {} };
  if (!existsSync(STATE_FILE)) return fresh;
  const s = JSON.parse(readFileSync(STATE_FILE, "utf8")) as State;
  if (s.month !== month) s.used = { search: 0, details: 0 }; // new month, new free allowance
  s.month = month;
  return { ...fresh, ...s };
}

function saveState(s: State) {
  writeFileSync(STATE_FILE + ".tmp", JSON.stringify(s));
  renameSync(STATE_FILE + ".tmp", STATE_FILE); // atomic, so a kill mid-write never corrupts it
}

class StopError extends Error {}

async function call(url: string, init: RequestInit) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) });
      if (res.ok) return await res.json();
      const body = await res.text();
      // Rate limits and server errors are worth retrying; anything else (bad key, quota off) is not.
      if ((res.status === 429 || res.status >= 500) && attempt < 5) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
        continue;
      }
      throw new StopError(`Places ${res.status}: ${body.slice(0, 300)}`);
    } catch (e) {
      if (e instanceof StopError || attempt >= 5) throw e instanceof StopError ? e : new StopError(String(e));
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

function initialQueue() {
  const q: NonNullable<State["queue"]> = [];
  for (const query of QUERIES) {
    for (let lat = AREA.south; lat < AREA.north; lat += START_STEP) {
      for (let lng = AREA.west; lng < AREA.east; lng += START_STEP) {
        q.push({
          query,
          box: {
            south: lat,
            west: lng,
            north: Math.min(lat + START_STEP, AREA.north),
            east: Math.min(lng + START_STEP, AREA.east),
          },
        });
      }
    }
  }
  return q;
}

/** Runs the search queue until it is empty or the next cell could break the budget. */
async function searchPhase(s: State) {
  const queue = (s.queue ??= initialQueue());
  while (queue.length) {
    // A full cell takes 3 pages; never start one that could go over budget.
    if (s.used.search + 3 > SEARCH_BUDGET) {
      console.log(`Search budget reached (${s.used.search}/${SEARCH_BUDGET}). ${queue.length} cells left for next month.`);
      return;
    }
    const { query, box } = queue[0];
    const found: Place[] = [];
    let token: string | undefined;
    do {
      s.used.search++;
      const page = (await call("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": KEY!, "X-Goog-FieldMask": SEARCH_FIELDS },
        body: JSON.stringify({
          textQuery: query,
          pageSize: 20,
          pageToken: token,
          locationRestriction: {
            rectangle: {
              low: { latitude: box.south, longitude: box.west },
              high: { latitude: box.north, longitude: box.east },
            },
          },
        }),
      })) as { places?: Place[]; nextPageToken?: string };
      found.push(...(page.places ?? []).filter((p) => p?.id));
      token = page.nextPageToken;
    } while (token);

    for (const p of found) s.places[p.id] = p;
    queue.shift();
    if (found.length >= 60 && (box.north - box.south) / 2 >= MIN_STEP) {
      const midLat = (box.south + box.north) / 2;
      const midLng = (box.west + box.east) / 2;
      queue.unshift(
        { query, box: { south: box.south, west: box.west, north: midLat, east: midLng } },
        { query, box: { south: box.south, west: midLng, north: midLat, east: box.east } },
        { query, box: { south: midLat, west: box.west, north: box.north, east: midLng } },
        { query, box: { south: midLat, west: midLng, north: box.north, east: box.east } },
      );
    }
    saveState(s);
    if (s.used.search % 50 < 3) {
      console.log(`search: ${s.used.search} requests, ${Object.keys(s.places).length} places, ${queue.length} cells left`);
    }
  }
  console.log(`Search finished: ${Object.keys(s.places).length} places.`);
}

const FOOD = /restaurant|cafe|coffee|bakery|bar|meal_|food|deli|pizza|sandwich|ice_cream|dessert|diner|bagel|juice|tea/;
const NOT_FOOD = new Set([
  "grocery_store",
  "supermarket",
  "convenience_store",
  "gas_station",
  "liquor_store",
  "lodging",
  "hotel",
  "pharmacy",
  "drugstore",
  "wholesaler",
  "catering_service",
]);
const CHAINS =
  /mcdonald|burger king|wendy|subway|dunkin|starbucks|domino|papa john|pizza hut|little caesar|taco bell|kfc|chipotle|popeyes|white castle|five guys|panera|shake shack|sweetgreen|jersey mike|dairy queen|ihop|applebee|chick-fil-a|wingstop|crumbl|qdoba|cava|just salad|potbelly|jimmy john|insomnia cookies|baskin|carvel|7-eleven|wawa|quickchek/i;

function city(p: Place) {
  return (p.addressComponents ?? []).find((c) => c?.types?.includes("locality"))?.longText ?? "";
}

function isLead(p: Place) {
  if (!CITIES.has(city(p)) || p.businessStatus !== "OPERATIONAL") return false;
  if (p.primaryType && NOT_FOOD.has(p.primaryType)) return false;
  return (p.types ?? []).some((t) => FOOD.test(t));
}

/** Fetches phone/website/rating for leads that don't have them yet, independents first. */
async function detailsPhase(s: State) {
  const todo = Object.values(s.places)
    .filter((p) => isLead(p) && !s.details[p.id])
    .sort((a, b) => Number(CHAINS.test(a.displayName?.text ?? "")) - Number(CHAINS.test(b.displayName?.text ?? "")));
  for (const [i, p] of todo.entries()) {
    if (s.used.details >= DETAILS_BUDGET) {
      console.log(`Details budget reached (${s.used.details}/${DETAILS_BUDGET}). ${todo.length - i} places left for next month.`);
      return;
    }
    s.used.details++;
    s.details[p.id] = (await call(`https://places.googleapis.com/v1/places/${p.id}`, {
      headers: { "X-Goog-Api-Key": KEY!, "X-Goog-FieldMask": DETAILS_FIELDS },
    })) as Details;
    saveState(s);
    if (s.used.details % 100 === 0) console.log(`details: ${i + 1}/${todo.length}`);
  }
}

function writeOutputs(s: State) {
  const leads = Object.values(s.places)
    .filter(isLead)
    .map((p) => {
      const name = p.displayName?.text ?? "";
      const d = s.details[p.id];
      return {
        place_id: p.id,
        name,
        city: city(p),
        address: p.formattedAddress ?? "",
        phone: d?.nationalPhoneNumber ?? "",
        website: d?.websiteUri ?? "",
        type: p.primaryTypeDisplayName?.text ?? p.primaryType ?? "",
        rating: d?.rating ?? "",
        reviews: d?.userRatingCount ?? "",
        chain: CHAINS.test(name) ? "yes" : "",
        details_pending: d ? "" : "yes",
        maps_url: p.googleMapsUri ?? "",
      };
    })
    .sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name));

  writeFileSync("leads/restaurants.json", JSON.stringify(leads, null, 2));
  writeFileSync("leads/restaurants.csv", toCsv(leads));
  const n = (f: (l: (typeof leads)[number]) => unknown) => leads.filter(f).length;
  console.log(
    `\n${leads.length} restaurants (Jersey City ${n((l) => l.city === "Jersey City")}, Hoboken ${n((l) => l.city === "Hoboken")}), ` +
      `${n((l) => l.website)} with a website, ${n((l) => l.details_pending)} waiting on details, ${n((l) => l.chain)} chains.\n` +
      `Used this month: ${s.used.search}/${SEARCH_BUDGET} searches, ${s.used.details}/${DETAILS_BUDGET} details.`,
  );
}

void (async () => {
  mkdirSync("leads", { recursive: true });
  const s = loadState();
  try {
    await searchPhase(s);
    await detailsPhase(s);
  } catch (e) {
    console.error(`Stopped: ${(e as Error).message}\nProgress is saved; run again to continue.`);
    process.exitCode = 1;
  } finally {
    saveState(s);
    writeOutputs(s);
  }
})();
