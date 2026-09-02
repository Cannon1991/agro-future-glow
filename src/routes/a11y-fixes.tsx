import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Monitor,
  RefreshCw,
  Ruler,
  ZoomIn,
} from "lucide-react";

export const Route = createFileRoute("/a11y-fixes")({
  head: () => ({
    meta: [
      { title: "Accessibility Fix List — AgroPulse Fix" },
      {
        name: "description",
        content:
          "Every accessibility check that failed last, with a Fix button that jumps straight to the section of the page that needs work.",
      },
      { property: "og:title", content: "Accessibility Fix List — AgroPulse Fix" },
      {
        property: "og:description",
        content: "Jump from each failing accessibility check to the exact page section to fix.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: A11yFixes,
});

type Check = {
  name: string;
  detail?: string;
  status: "pass" | "fail";
  viewport: string;
  width: number | null;
  height: number | null;
  zoom: number;
  lastRunAt?: string;
  lastFailedAt?: string;
  lastFailureDetail?: string;
  lastFailedViewport?: string;
  lastFailedSize?: string;
  lastFailedZoom?: number;
};

type Suite = {
  id: string;
  title: string;
  file: string;
  status: string;
  ranAt: string | null;
  checks: Check[];
};

type Report = {
  generatedAt: string;
  suites: Suite[];
  totals: { checks: number; failing: number; suites: number; failingSuites: number };
};

/** Where on the landing page each failing check should send you to fix it. */
const SECTIONS: Record<string, { hash: string; label: string }> = {
  interactive_demo: { hash: "demo", label: "Interactive demo form" },
  keyboard_nav: { hash: "demo", label: "Interactive demo form" },
  keyboard_320: { hash: "demo", label: "Interactive demo form" },
  live_regions: { hash: "demo", label: "Interactive demo form" },
  reduced_motion: { hash: "dashboard", label: "Animated dashboard section" },
  reflow_zoom: { hash: "impact", label: "Impact & layout sections" },
  contrast_landmarks: { hash: "platform", label: "Platform section" },
  contrast_narrow: { hash: "platform", label: "Platform section" },
  landmarks_narrow: { hash: "contact", label: "Page landmarks & footer" },
};

function targetFor(suiteId: string, check: Check) {
  const base = SECTIONS[suiteId] ?? { hash: "platform", label: "Landing page" };
  const name = check.name.toLowerCase();
  if (name.includes("contact")) return { hash: "contact", label: "Contact section" };
  if (name.includes("nav") || name.includes("header")) return { hash: "platform", label: "Header & navigation" };
  return base;
}

function when(iso?: string | null) {
  if (!iso) return "never";
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} h ago`;
  return d.toLocaleString();
}

function Chip({ icon: Icon, children }: { icon: typeof Ruler; children: React.ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{children}</span>
    </span>
  );
}

function A11yFixes() {
  const { data, isLoading, isFetching, error, refetch } = useQuery<Report>({
    queryKey: ["a11y-report"],
    queryFn: async () => {
      const res = await fetch(`/a11y-report.json?t=${Date.now()}`);
      if (!res.ok) throw new Error("No report found");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const rows = (data?.suites ?? [])
    .flatMap((suite) => suite.checks.map((check) => ({ suite, check })))
    .filter(({ check }) => check.status === "fail" || check.lastFailedAt)
    .sort((a, b) => {
      if (a.check.status !== b.check.status) return a.check.status === "fail" ? -1 : 1;
      return (b.check.lastFailedAt ?? "").localeCompare(a.check.lastFailedAt ?? "");
    });

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap gap-4 text-sm">
        <Link to="/" className="text-muted-foreground underline-offset-4 hover:underline">
          ← Back to AgroPulse Fix
        </Link>
        <Link to="/a11y" className="text-muted-foreground underline-offset-4 hover:underline">
          Full dashboard
        </Link>
      </nav>

      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Accessibility fix list</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Every check that failed on its last recorded run, with the viewport, screen size and text
            zoom it failed at. Use Fix to jump straight to the section of the page that needs work.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted"
        >
          <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
          Refresh
        </button>
      </header>

      <div aria-live="polite">
        {isLoading && <p className="text-sm text-muted-foreground">Loading latest results…</p>}

        {error && (
          <div role="alert" className="rounded-xl border border-border bg-muted/40 p-6">
            <h2 className="text-base font-semibold">No report yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Run <code className="rounded bg-muted px-1 py-0.5">python3 tests/a11y/run_all.py</code> to
              generate <code>public/a11y-report.json</code>, then refresh this page.
            </p>
          </div>
        )}

        {data && rows.length === 0 && (
          <p className="inline-flex items-center gap-2 rounded-lg border border-border p-4 text-sm">
            <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
            No check has ever been recorded as failing. Last run {when(data.generatedAt)}.
          </p>
        )}

        {data && rows.length > 0 && (
          <section aria-labelledby="fix-list">
            <h2 id="fix-list" className="mb-3 text-lg font-semibold">
              Checks to fix ({rows.length})
            </h2>
            <ul className="space-y-3">
              {rows.map(({ suite, check }, i) => {
                const target = targetFor(suite.id, check);
                const failing = check.status === "fail";
                return (
                  <li
                    key={`${suite.id}-${i}`}
                    className={`min-w-0 rounded-xl border p-4 ${
                      failing ? "border-destructive/40 bg-destructive/[0.04]" : "border-border"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-2">
                        {failing ? (
                          <AlertTriangle
                            className="mt-0.5 size-4 shrink-0 text-destructive"
                            aria-hidden="true"
                          />
                        ) : (
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                        )}
                        <div className="min-w-0">
                          <p className="break-words font-medium">{check.name}</p>
                          <p className="mt-1 break-words text-sm text-muted-foreground">
                            {failing
                              ? check.detail || "Failing in the latest run."
                              : `Passing now — last failed ${when(check.lastFailedAt)}.`}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Chip icon={Monitor}>{check.lastFailedViewport ?? check.viewport}</Chip>
                            <Chip icon={Ruler}>
                              {check.lastFailedSize ?? `${check.width}×${check.height}`} px
                            </Chip>
                            <Chip icon={ZoomIn}>
                              {Math.round((check.lastFailedZoom ?? check.zoom) * 100)}% text zoom
                            </Chip>
                            <Chip icon={Clock}>last failed {when(check.lastFailedAt)}</Chip>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {suite.title} · {suite.file} · fixes live in {target.label}
                          </p>
                        </div>
                      </div>
                      <Link
                        to="/"
                        hash={target.hash}
                        aria-label={`Fix ${check.name} in ${target.label}`}
                        className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
                      >
                        Fix
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
