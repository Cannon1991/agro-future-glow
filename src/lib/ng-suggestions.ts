// Nigeria-first autocomplete corpus for the interactive demo.
// Kept lightweight — no external data fetch. Extend freely.

export type SuggestionKind = "state" | "lga" | "village" | "country";

export type Suggestion = {
  /** Full text inserted into the input when selected. */
  value: string;
  /** Short label shown as the primary line. */
  label: string;
  /** Secondary context (e.g. "LGA · Ekiti State"). */
  hint: string;
  kind: SuggestionKind;
  /** Nigeria-first ranking boost. Higher = shown first. */
  boost: number;
};

// 36 states + FCT
const NG_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
  "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
  "FCT Abuja",
];

// A curated set of well-known LGAs across regions (not exhaustive).
const NG_LGAS: Array<{ lga: string; state: string }> = [
  { lga: "Ado Ekiti", state: "Ekiti" },
  { lga: "Ikere", state: "Ekiti" },
  { lga: "Ijero", state: "Ekiti" },
  { lga: "Ikole", state: "Ekiti" },
  { lga: "Ibadan North", state: "Oyo" },
  { lga: "Ibadan South-West", state: "Oyo" },
  { lga: "Ogbomosho North", state: "Oyo" },
  { lga: "Oyo East", state: "Oyo" },
  { lga: "Ikeja", state: "Lagos" },
  { lga: "Eti-Osa", state: "Lagos" },
  { lga: "Alimosho", state: "Lagos" },
  { lga: "Surulere", state: "Lagos" },
  { lga: "Kano Municipal", state: "Kano" },
  { lga: "Fagge", state: "Kano" },
  { lga: "Nassarawa", state: "Kano" },
  { lga: "Kaduna North", state: "Kaduna" },
  { lga: "Kaduna South", state: "Kaduna" },
  { lga: "Zaria", state: "Kaduna" },
  { lga: "Port Harcourt", state: "Rivers" },
  { lga: "Obio-Akpor", state: "Rivers" },
  { lga: "Uyo", state: "Akwa Ibom" },
  { lga: "Calabar Municipal", state: "Cross River" },
  { lga: "Benin City", state: "Edo" },
  { lga: "Warri South", state: "Delta" },
  { lga: "Enugu North", state: "Enugu" },
  { lga: "Nsukka", state: "Enugu" },
  { lga: "Owerri Municipal", state: "Imo" },
  { lga: "Awka South", state: "Anambra" },
  { lga: "Onitsha North", state: "Anambra" },
  { lga: "Abeokuta South", state: "Ogun" },
  { lga: "Ijebu Ode", state: "Ogun" },
  { lga: "Ilorin West", state: "Kwara" },
  { lga: "Sokoto North", state: "Sokoto" },
  { lga: "Maiduguri", state: "Borno" },
  { lga: "Jos North", state: "Plateau" },
  { lga: "Makurdi", state: "Benue" },
  { lga: "Lokoja", state: "Kogi" },
  { lga: "Minna", state: "Niger" },
  { lga: "Bauchi", state: "Bauchi" },
  { lga: "Yola North", state: "Adamawa" },
  { lga: "Damaturu", state: "Yobe" },
  { lga: "Dutse", state: "Jigawa" },
  { lga: "Gusau", state: "Zamfara" },
  { lga: "Birnin Kebbi", state: "Kebbi" },
  { lga: "Katsina", state: "Katsina" },
  { lga: "Lafia", state: "Nasarawa" },
  { lga: "Gombe", state: "Gombe" },
  { lga: "Jalingo", state: "Taraba" },
  { lga: "Umuahia North", state: "Abia" },
  { lga: "Abakaliki", state: "Ebonyi" },
  { lga: "Yenagoa", state: "Bayelsa" },
  { lga: "Osogbo", state: "Osun" },
  { lga: "Akure South", state: "Ondo" },
  { lga: "Municipal Area Council", state: "FCT Abuja" },
];

// A handful of well-known villages/towns for the example-format experience.
const NG_VILLAGES: Array<{ village: string; lga: string; state: string }> = [
  { village: "Ilokun", lga: "Ado Ekiti", state: "Ekiti" },
  { village: "Iworoko", lga: "Irepodun/Ifelodun", state: "Ekiti" },
  { village: "Are", lga: "Ikole", state: "Ekiti" },
  { village: "Iseyin", lga: "Iseyin", state: "Oyo" },
  { village: "Saki", lga: "Saki West", state: "Oyo" },
  { village: "Badagry", lga: "Badagry", state: "Lagos" },
  { village: "Epe", lga: "Epe", state: "Lagos" },
  { village: "Dawakin Tofa", lga: "Dawakin Tofa", state: "Kano" },
  { village: "Bichi", lga: "Bichi", state: "Kano" },
  { village: "Sabon Gari", lga: "Zaria", state: "Kaduna" },
  { village: "Bonny", lga: "Bonny", state: "Rivers" },
  { village: "Oron", lga: "Oron", state: "Akwa Ibom" },
  { village: "Nnewi", lga: "Nnewi North", state: "Anambra" },
  { village: "Aba", lga: "Aba North", state: "Abia" },
  { village: "Suleja", lga: "Suleja", state: "Niger" },
  { village: "Gwagwalada", lga: "Gwagwalada", state: "FCT Abuja" },
];

// Neighbouring / partner countries surfaced after Nigeria.
const COUNTRIES = [
  "Nigeria", "Ghana", "Benin", "Togo", "Côte d'Ivoire", "Cameroon",
  "Niger", "Chad", "Senegal", "Mali", "Burkina Faso", "Sierra Leone",
  "Liberia", "Kenya", "Uganda", "Tanzania", "Rwanda", "Ethiopia",
  "South Africa", "Egypt", "Morocco",
];

export const SUGGESTIONS: Suggestion[] = [
  ...NG_VILLAGES.map((v) => ({
    value: `${v.village}, ${v.lga} LGA, ${v.state} State`,
    label: v.village,
    hint: `Village · ${v.lga} LGA, ${v.state} State`,
    kind: "village" as const,
    boost: 40,
  })),
  ...NG_LGAS.map((l) => ({
    value: `${l.lga} LGA, ${l.state} State`,
    label: `${l.lga} LGA`,
    hint: `Local Government · ${l.state} State`,
    kind: "lga" as const,
    boost: 30,
  })),
  ...NG_STATES.map((s) => ({
    value: `${s} State, Nigeria`,
    label: `${s} State`,
    hint: "State · Nigeria",
    kind: "state" as const,
    boost: 20,
  })),
  ...COUNTRIES.map((c) => ({
    value: c,
    label: c,
    hint: "Country",
    kind: "country" as const,
    boost: c === "Nigeria" ? 25 : 5,
  })),
];

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function searchSuggestions(query: string, limit = 7): Suggestion[] {
  const q = norm(query.trim());
  if (!q) {
    // Show a curated Nigeria-first starter set.
    return [...SUGGESTIONS]
      .sort((a, b) => b.boost - a.boost)
      .slice(0, limit);
  }
  const scored: Array<{ s: Suggestion; score: number }> = [];
  for (const s of SUGGESTIONS) {
    const hay = norm(`${s.label} ${s.hint} ${s.value}`);
    const idx = hay.indexOf(q);
    if (idx === -1) continue;
    // Prefix match on label ranks highest.
    const labelIdx = norm(s.label).indexOf(q);
    let score = s.boost - idx;
    if (labelIdx === 0) score += 50;
    else if (labelIdx > 0) score += 20;
    scored.push({ s, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.s);
}
