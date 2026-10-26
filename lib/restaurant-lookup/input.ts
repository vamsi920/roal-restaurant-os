export type LookupInput = {
  name: string;
  city: string;
};

export type LookupInputError = {
  error: string;
};

const MAX_LEN = 80;

export function parseLookupInput(raw: unknown): LookupInput | LookupInputError {
  if (!raw || typeof raw !== "object") {
    return { error: "Restaurant name and city are required." };
  }
  const row = raw as Record<string, unknown>;
  const name = typeof row.name === "string" ? row.name.trim() : "";
  const city = typeof row.city === "string" ? row.city.trim() : "";
  if (!name) return { error: "Restaurant name is required." };
  if (!city) return { error: "City is required." };
  if (name.length > MAX_LEN) return { error: "Restaurant name is too long." };
  if (city.length > MAX_LEN) return { error: "City is too long." };
  return { name, city };
}
