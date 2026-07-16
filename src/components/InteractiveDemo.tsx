import { useState, useMemo, useEffect, useRef, useId } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Satellite, Sparkles, MapPin, ArrowRight, AlertTriangle, CheckCircle2, Circle, Info, Building2, Landmark, Home, Globe2 } from "lucide-react";
import { z } from "zod";
import { analyzeLocation, type DemoAnalysis } from "@/lib/demo.functions";
import { searchSuggestions, type Suggestion } from "@/lib/ng-suggestions";

const KIND_ICON: Record<Suggestion["kind"], typeof MapPin> = {
  village: Home,
  lga: Building2,
  state: Landmark,
  country: Globe2,
};

// Client-side validation for the location query.
// Accepts formats like:
//   "Ado LGA, Ekiti State"
//   "Ado, Ekiti, Nigeria"
//   "Kano State"
//   "Ogbomosho, Oyo"
const LOCATION_REGEX = /^[\p{L}\p{M}0-9][\p{L}\p{M}0-9\s.,'\-/()]{1,118}[\p{L}\p{M}0-9.)]$/u;

const LocationSchema = z
  .string()
  .trim()
  .min(2, { message: "Enter at least 2 characters." })
  .max(120, { message: "Keep it under 120 characters." })
  .regex(LOCATION_REGEX, {
    message: "Use letters, numbers, spaces, commas or hyphens only.",
  })
  .refine((v) => /[\p{L}]/u.test(v), {
    message: "Include the place name (letters), not just numbers.",
  })
  .refine((v) => !/(.)\1{4,}/.test(v), {
    message: "That doesn't look like a real place name.",
  });

function validateLocation(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const result = LocationSchema.safeParse(raw);
  if (result.success) return { ok: true, value: result.data };
  return { ok: false, error: result.error.issues[0]?.message ?? "Invalid location." };
}


const DEMO_STEPS = [
  { key: "geo", label: "Locating region & pulling boundaries" },
  { key: "sat", label: "Fetching Sentinel-2 imagery" },
  { key: "ndvi", label: "Computing NDVI & segmenting parcels" },
  { key: "climate", label: "Cross-referencing climate & soil data" },
  { key: "ai", label: "Generating AI crop advisory" },
];

function ProgressChecklist({ active }: { active: boolean }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!active) {
      setStep(0);
      return;
    }
    setStep(0);
    const id = setInterval(() => {
      setStep((s) => (s < DEMO_STEPS.length - 1 ? s + 1 : s));
    }, 1400);
    return () => clearInterval(id);
  }, [active]);

  return (
    <ul className="space-y-2.5">
      {DEMO_STEPS.map((s, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <li key={s.key} className="flex items-center gap-3 text-sm">
            {done ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
            ) : current ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
            )}
            <span
              className={
                done
                  ? "text-foreground"
                  : current
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              }
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function MapSkeleton() {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-secondary/40 shadow-[var(--shadow-soft)]">
      <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_30%_30%,oklch(0.9_0.03_130),oklch(0.82_0.04_150))]" />
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        {Array.from({ length: 18 }).map((_, i) => {
          const x = (i * 37) % 80 + 5;
          const y = (i * 53) % 78 + 6;
          const w = 8 + ((i * 7) % 10);
          const h = 6 + ((i * 5) % 9);
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={w}
              height={h}
              rx="0.6"
              fill="oklch(0.75 0.04 140)"
              fillOpacity="0.55"
              className="animate-pulse"
              style={{ animationDelay: `${(i % 6) * 120}ms` }}
            />
          );
        })}
      </svg>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-emerald-300/40 to-transparent"
        style={{ animation: "scan 2s ease-in-out infinite" }}
      />
      <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur">
        <Loader2 className="h-3 w-3 animate-spin" /> Scanning imagery…
      </div>
      <style>{`@keyframes scan { 0%,100% { transform: translateY(-30%); } 50% { transform: translateY(320%); } }`}</style>
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div>
        <div className="h-6 w-40 animate-pulse rounded-full bg-secondary" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="h-3 w-24 animate-pulse rounded bg-secondary" />
              <div className="mt-3 h-6 w-20 animate-pulse rounded bg-secondary" />
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-3 w-3/4 animate-pulse rounded bg-secondary" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-secondary" />
        </div>
      </div>
      <div>
        <div className="h-4 w-40 animate-pulse rounded bg-secondary" />
        <ul className="mt-3 space-y-3">
          {[0, 1, 2].map((i) => (
            <li key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="h-4 w-28 animate-pulse rounded bg-secondary" />
                <div className="h-4 w-10 animate-pulse rounded bg-secondary" />
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-[image:var(--gradient-primary)] opacity-60"
                  style={{ width: `${40 + i * 20}%`, animation: "pulse 1.6s ease-in-out infinite" }}
                />
              </div>
              <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-secondary" />
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <div className="h-3 w-24 animate-pulse rounded bg-primary/20" />
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-primary/15" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-primary/15" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-primary/15" />
        </div>
      </div>
    </div>
  );
}


// Deterministic hash → seeded PRNG so the same location always renders the same map
function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Parcel = { x: number; y: number; w: number; h: number; hue: number; rot: number };

function generateParcels(seed: number, count: number): Parcel[] {
  const rand = mulberry32(seed);
  const parcels: Parcel[] = [];
  const target = Math.min(80, Math.max(24, Math.round(count / 6)));
  let guard = 0;
  while (parcels.length < target && guard++ < 800) {
    const w = 6 + rand() * 14;
    const h = 5 + rand() * 12;
    const x = 4 + rand() * (96 - w);
    const y = 4 + rand() * (96 - h);
    const overlap = parcels.some(
      (p) => x < p.x + p.w + 0.6 && x + w + 0.6 > p.x && y < p.y + p.h + 0.6 && y + h + 0.6 > p.y
    );
    if (overlap) continue;
    parcels.push({
      x,
      y,
      w,
      h,
      hue: 90 + rand() * 60, // greens/olives
      rot: (rand() - 0.5) * 10,
    });
  }
  return parcels;
}

function ParcelMap({ seed, detected }: { seed: number; detected: number }) {
  const parcels = useMemo(() => generateParcels(seed, detected), [seed, detected]);
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-[oklch(0.28_0.05_140)] shadow-[var(--shadow-elevated)]">
      {/* base terrain gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,oklch(0.42_0.08_130),oklch(0.24_0.05_150))]" />
      {/* grid overlay */}
      <svg className="absolute inset-0 h-full w-full opacity-30" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="8%" height="8%" patternUnits="userSpaceOnUse">
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="white" strokeWidth="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      {/* parcels */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        {parcels.map((p, i) => (
          <rect
            key={i}
            x={p.x}
            y={p.y}
            width={p.w}
            height={p.h}
            transform={`rotate(${p.rot} ${p.x + p.w / 2} ${p.y + p.h / 2})`}
            fill={`oklch(0.65 0.14 ${p.hue})`}
            fillOpacity="0.85"
            stroke="oklch(0.95 0.02 130)"
            strokeWidth="0.25"
          />
        ))}
      </svg>
      {/* scan line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 animate-[scan_3.5s_ease-in-out_infinite] bg-gradient-to-b from-emerald-300/25 to-transparent" />
      <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur">
        <Satellite className="h-3 w-3" /> Sentinel-2 · NDVI composite
      </div>
      <div className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur">
        {parcels.length} parcels rendered
      </div>
      <style>{`@keyframes scan { 0%,100% { transform: translateY(-30%); } 50% { transform: translateY(320%); } }`}</style>
    </div>
  );
}

function ResultPanel({ data }: { data: DemoAnalysis }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <MapPin className="h-3.5 w-3.5" /> {data.region}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Parcels detected</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{data.parcels.detected.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Avg. size</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{data.parcels.avgHectares.toFixed(1)} ha</p>
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
          <p><span className="font-medium text-foreground">Climate:</span> {data.climate}</p>
          <p><span className="font-medium text-foreground">Soil:</span> {data.soil}</p>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Crop suitability</h4>
        <ul className="mt-3 space-y-3">
          {data.crops.map((c) => (
            <li key={c.name} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold text-foreground">{c.name}</span>
                <span className="text-sm font-bold text-primary">{c.suitability}%</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-[image:var(--gradient-primary)]"
                  style={{ width: `${c.suitability}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{c.window}</span> · {c.note}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Risks to watch</h4>
        <ul className="mt-3 flex flex-wrap gap-2">
          {data.risks.map((r) => (
            <li
              key={r}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300"
            >
              <AlertTriangle className="h-3 w-3" /> {r}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-widest">AI advisory</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-foreground">{data.advisory}</p>
      </div>
    </div>
  );
}

export function InteractiveDemo() {
  const [location, setLocation] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const analyze = useServerFn(analyzeLocation);

  const mutation = useMutation({
    mutationFn: (loc: string) => analyze({ data: { location: loc } }),
    onSuccess: (_d, loc) => setSubmitted(loc),
  });

  const [touched, setTouched] = useState(false);
  const validation = useMemo(() => validateLocation(location), [location]);
  const showError = touched && !validation.ok && location.trim().length > 0;
  const inputId = "demo-location";
  const hintId = "demo-location-hint";
  const errorId = "demo-location-error";
  const listboxId = useId();

  // Autocomplete state
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const suggestions = useMemo(() => searchSuggestions(location, 7), [location]);

  useEffect(() => {
    setHighlight(0);
  }, [location]);

  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleClose = () => {
    closeTimeoutRef.current = setTimeout(() => setOpen(false), 120);
  };
  const cancelClose = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    const node = wrapRef.current;
    if (!open || !node) return;

    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (node.contains(e.target as Node)) {
        // Click/touch inside the wrapper cancels any scheduled close so
        // selecting a suggestion or re-focusing the input keeps the dropdown open.
        cancelClose();
      } else {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      cancelClose();
    };
  }, [open]);

  const pickSuggestion = (s: Suggestion) => {
    cancelClose();
    setLocation(s.value);
    setOpen(false);
    setTouched(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && suggestions[highlight]) {
      e.preventDefault();
      pickSuggestion(suggestions[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setOpen(false);
    if (!validation.ok) return;
    mutation.mutate(validation.value);
  };


  const seed = useMemo(() => hashString(submitted ?? "seed"), [submitted]);

  return (
    <section id="demo" className="bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-primary">Live demo</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            See your village from orbit.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Enter any Nigerian village, local government or state. Our AI simulates a
            satellite parcel map and generates a crop-suitability briefing in seconds.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          noValidate
          className="mx-auto mt-10 max-w-2xl"
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <div ref={wrapRef} className="relative flex-1">
              <MapPin className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                id={inputId}
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => {
                  cancelClose();
                  setOpen(true);
                }}
                onBlur={() => {
                  setTouched(true);
                  // Defer closing so touch/mouse clicks on the dropdown still
                  // register before the dropdown disappears.
                  scheduleClose();
                }}
                onKeyDown={onKeyDown}
                maxLength={120}
                autoComplete="off"
                spellCheck={false}
                role="combobox"
                aria-expanded={open}
                aria-controls={listboxId}
                aria-autocomplete="list"
                aria-activedescendant={
                  open && suggestions[highlight] ? `${listboxId}-opt-${highlight}` : undefined
                }
                placeholder="Try: Ado Ekiti LGA, Ekiti State"
                aria-label="Village, local government, state or country"
                aria-invalid={showError || undefined}
                aria-describedby={showError ? `${hintId} ${errorId}` : hintId}
                className={`h-14 w-full rounded-full border bg-card pl-12 pr-5 text-base text-foreground shadow-[var(--shadow-soft)] outline-none transition focus:ring-2 ${
                  showError
                    ? "border-destructive focus:border-destructive focus:ring-destructive/30"
                    : "border-border focus:border-primary focus:ring-primary/30"
                }`}
              />
              {open && suggestions.length > 0 && (
                <ul
                  id={listboxId}
                  role="listbox"
                  className="absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-auto rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-[var(--shadow-elevated)]"
                >
                  <li role="presentation" className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {location.trim() ? "Matches" : "Nigeria-first suggestions"}
                  </li>
                  {suggestions.map((s, i) => {
                    const Icon = KIND_ICON[s.kind];
                    const active = i === highlight;
                    return (
                      <li
                        key={`${s.value}-${i}`}
                        id={`${listboxId}-opt-${i}`}
                        role="option"
                        aria-selected={active}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          pickSuggestion(s);
                        }}
                        onMouseEnter={() => setHighlight(i)}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                          active ? "bg-primary/10 text-foreground" : "text-foreground hover:bg-secondary"
                        }`}
                      >
                        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{s.label}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {s.hint}
                          </span>
                        </span>
                        <span className="mt-1 shrink-0 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                          {s.kind}
                        </span>
                      </li>
                    );
                  })}
                  <li className="mt-1 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
                    Format examples:{" "}
                    <span className="font-medium text-foreground">Village, LGA, State</span>{" · "}
                    <span className="font-medium text-foreground">LGA, State</span>{" · "}
                    <span className="font-medium text-foreground">State, Country</span>
                  </li>
                </ul>
              )}
            </div>
            <button
              type="submit"
              disabled={mutation.isPending || (touched && !validation.ok)}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[image:var(--gradient-primary)] px-7 text-base font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mutation.isPending ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Analyzing…</>
              ) : (
                <>Analyze <ArrowRight className="h-5 w-5" /></>
              )}
            </button>
          </div>


          {showError ? (
            <p
              id={errorId}
              role="alert"
              className="mt-3 flex items-start gap-2 px-2 text-sm font-medium text-destructive"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{(validation as { ok: false; error: string }).error}</span>
            </p>
          ) : (
            <p
              id={hintId}
              className="mt-3 flex items-start gap-2 px-2 text-xs text-muted-foreground"
            >
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
              <span>
                Format: <span className="font-medium text-foreground">Village, LGA, State</span> — country is optional.
                Use 2–120 characters, letters, numbers, spaces, commas or hyphens.
              </span>
            </p>
          )}
        </form>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          Try: <button type="button" onClick={() => { setLocation("Ado LGA, Ekiti State"); setTouched(false); }} className="underline underline-offset-2 hover:text-primary">Ado LGA, Ekiti State</button>
          {" · "}
          <button type="button" onClick={() => { setLocation("Kano State"); setTouched(false); }} className="underline underline-offset-2 hover:text-primary">Kano State</button>
          {" · "}
          <button type="button" onClick={() => { setLocation("Ogbomosho, Oyo"); setTouched(false); }} className="underline underline-offset-2 hover:text-primary">Ogbomosho, Oyo</button>
        </p>

        {mutation.isPending && (
          <div
            role="status"
            aria-live="polite"
            className="mx-auto mt-6 flex max-w-2xl items-center justify-center gap-2 text-sm text-muted-foreground"
          >
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Analyzing “{location.trim()}” — this usually takes 5–10 seconds.
          </div>
        )}


        <div className="mt-14 grid gap-8 lg:grid-cols-2 lg:items-start">
          <div className="lg:sticky lg:top-24">
            {mutation.isPending ? (
              <MapSkeleton />
            ) : mutation.isError ? (
              <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 p-6">
                <div className="text-center">
                  <AlertTriangle className="mx-auto h-10 w-10 text-destructive/70" />
                  <p className="mt-3 text-sm font-medium text-destructive">
                    Map generation failed
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    We couldn't render the parcel map for this location.
                  </p>
                </div>
              </div>
            ) : submitted && mutation.data ? (
              <ParcelMap seed={seed} detected={mutation.data.parcels.detected} />
            ) : (
              <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-secondary/30">
                <div className="text-center">
                  <Satellite className="mx-auto h-10 w-10 text-muted-foreground/60" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Your parcel map will appear here.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div>
            {mutation.isError && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-destructive">
                      AI briefing unavailable
                    </h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      We couldn't generate a briefing for
                      {location.trim() ? ` “${location.trim()}”` : " this location"}.
                      This can happen if the AI service is busy, the network dropped,
                      or the location wasn't recognized. Please check your spelling and try again.
                    </p>
                    {mutation.error instanceof Error && mutation.error.message && (
                      <p className="mt-2 rounded-md bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive/90">
                        {mutation.error.message}
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const loc = (submitted ?? location).trim();
                          if (loc.length >= 2) mutation.mutate(loc);
                        }}
                        disabled={mutation.isPending}
                        className="inline-flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
                      >
                        <Loader2 className={`h-3.5 w-3.5 ${mutation.isPending ? "animate-spin" : "hidden"}`} />
                        Retry analysis
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          mutation.reset();
                          setSubmitted(null);
                        }}
                        className="inline-flex items-center rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary"
                      >
                        Try a different location
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {mutation.isPending ? (
              <div className="space-y-6">
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
                  <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-widest">
                      Generating briefing
                    </span>
                  </div>
                  <div className="mt-4">
                    <ProgressChecklist active={mutation.isPending} />
                  </div>
                  <div className="relative mt-5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-[image:var(--gradient-primary)]"
                      style={{ animation: "demoBar 1.6s ease-in-out infinite" }}
                    />
                  </div>
                  <style>{`@keyframes demoBar { 0% { transform: translateX(-100%); } 100% { transform: translateX(320%); } }`}</style>
                </div>
                <ResultSkeleton />
              </div>
            ) : mutation.data ? (
              <ResultPanel data={mutation.data} />
            ) : !mutation.isError && (
              <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground shadow-[var(--shadow-soft)]">
                <Sparkles className="mx-auto h-8 w-8 text-primary/60" />
                <p className="mt-3 text-sm">
                  Enter a location above to generate a live AI briefing — parcel
                  count, best crops, planting windows and risks.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
