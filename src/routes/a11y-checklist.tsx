import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Monitor,
  RefreshCw,
  Ruler,
  Wrench,
  ZoomIn,
} from "lucide-react";
import { runA11ySuite, type RunResult } from "@/lib/a11y.functions";

export const Route = createFileRoute("/a11y-checklist")({
  head: () => ({
    meta: [
      { title: "Accessibility Checklist — AgroPulse Fix" },
      {
        name: "description",
        content:
          "Every accessibility check in one checklist with its current pass or fail status, viewport, screen size and text zoom.",
      },
      { property: "og:title", content: "Accessibility Checklist — AgroPulse Fix" },
      {
        property: "og:description",
        content: "Track every accessibility check and its current status in one list.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: A11yChecklist,
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

type Filter = "all" | "fail" | "pass";

/** Where on the landing page each suite's problems usually live. */
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
  mobile_page: { hash: "platform", label: "Mobile page" },
  tablet_desktop: { hash: "platform", label: "Header & navigation" },
};

/** Plain-language remedy shown inline when you press Fix. */
function fixAdvice(check: Check): string {
  const n = check.name.toLowerCase();
  if (n.includes("tap target"))
    return "Make the listed buttons and links at least 44×44 pixels — add min-h-11 min-w-11 (or more padding) to them.";
  if (n.includes("contrast"))
    return "Darken the text colour or lighten the background until the ratio is at least 4.5:1 for body text (3:1 for large text). Adjust the token in src/styles.css rather than the component.";
  if (n.includes("overflow"))
    return "Something is wider than the screen. Add min-w-0 and break-words to the offending container, and let long labels wrap instead of forcing a fixed width.";
  if (n.includes("heading"))
    return "Keep headings in order — one h1 per page, then h2, then h3 — and never skip a level or leave a heading empty.";
  if (n.includes("main") || n.includes("header") || n.includes("footer") || n.includes("landmark"))
    return "Each page needs exactly one header, one main and one footer at the top level; give each navigation its own label.";
  if (n.includes("skip link"))
    return "The skip link must be the very first thing keyboard users reach and must become visible and big enough when focused.";
  if (n.includes("focus"))
    return "Interactive elements must show a clear focus ring and receive focus in a logical order — avoid removing outlines or using positive tabIndex.";
  if (n.includes("aria-describedby") || n.includes("aria-invalid") || n.includes("announce"))
    return "Wire each field to its error text with aria-describedby, set aria-invalid while it's wrong, and announce changes in a live region.";
  if (n.includes("axe"))
    return "Open the listed elements in the report output — axe names the exact rule and node that failed.";
  if (n.includes("motion") || n.includes("animation"))
    return "Wrap the animation so it collapses to near-zero duration under prefers-reduced-motion.";
  return "Re-run this check to see the exact failing element in the output below, then fix that element on the page.";
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

function A11yChecklist() {
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, RunResult>>({});

  const { data, isLoading, isFetching, error, refetch } = useQuery<Report>({
    queryKey: ["a11y-report"],
    queryFn: async () => {
      const res = await fetch(`/a11y-report.json?t=${Date.now()}`);
      if (!res.ok) throw new Error("No report found");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const runSuite = useServerFn(runA11ySuite);
  const run = useMutation({
    mutationFn: (suiteId: string) => runSuite({ data: { suiteId: suiteId as never } }),
    onSuccess: (result) => {
      setResults((r) => ({ ...r, [result.suiteId]: result }));
      refetch();
    },
  });

  const suites = useMemo(() => {
    return (data?.suites ?? []).map((suite) => ({
      suite,
      checks: suite.checks.filter((c) => (filter === "all" ? true : c.status === filter)),
      failing: suite.checks.filter((c) => c.status === "fail").length,
    }));
  }, [data, filter]);

  const totals = data?.totals;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap gap-4 text-sm">
        <Link to="/" className="text-muted-foreground underline-offset-4 hover:underline">
          ← Back to AgroPulse Fix
        </Link>
        <Link to="/a11y" className="text-muted-foreground underline-offset-4 hover:underline">
          Full dashboard
        </Link>
        <Link to="/a11y-fixes" className="text-muted-foreground underline-offset-4 hover:underline">
          Fix list
        </Link>
      </nav>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Accessibility checklist</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Every check we run, grouped by suite, with its current status. Press Fix on any check to
            re-run its test and see the fix inline. Last run {when(data?.generatedAt)}.
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

      {totals && (
        <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Checks", value: totals.checks },
            { label: "Passing", value: totals.checks - totals.failing },
            { label: "Failing", value: totals.failing },
            { label: "Suites", value: totals.suites },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border p-4">
              <dt className="text-xs text-muted-foreground">{s.label}</dt>
              <dd className="mt-1 text-2xl font-semibold">{s.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter checks by status">
        {(["all", "fail", "pass"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-medium ${
              filter === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-muted"
            }`}
          >
            {f === "all" ? "All checks" : f === "fail" ? "Still failing" : "Passing"}
          </button>
        ))}
      </div>

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

        {data &&
          suites.map(({ suite, checks, failing }) =>
            checks.length === 0 ? null : (
              <section key={suite.id} className="mb-8" aria-labelledby={`suite-${suite.id}`}>
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 id={`suite-${suite.id}`} className="text-lg font-semibold">
                    {suite.title}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {suite.file} · {failing > 0 ? `${failing} failing` : "all passing"} ·{" "}
                    {checks.length} shown
                  </p>
                </div>
                <ul className="space-y-2">
                  {checks.map((check, i) => {
                    const failed = check.status === "fail";
                    const id = `${suite.id}-${i}`;
                    const open = openId === id;
                    const busy = run.isPending && run.variables === suite.id;
                    const result = results[suite.id];
                    const section = SECTIONS[suite.id] ?? { hash: "platform", label: "Landing page" };
                    return (
                      <li
                        key={id}
                        className={`min-w-0 rounded-xl border p-3 ${
                          failed ? "border-destructive/40 bg-destructive/[0.04]" : "border-border"
                        }`}
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          {failed ? (
                            <AlertTriangle
                              className="mt-0.5 size-4 shrink-0 text-destructive"
                              aria-hidden="true"
                            />
                          ) : (
                            <CheckCircle2
                              className="mt-0.5 size-4 shrink-0 text-primary"
                              aria-hidden="true"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm font-medium">
                              <span className="sr-only">{failed ? "Failing: " : "Passing: "}</span>
                              {check.name}
                            </p>
                            {failed && check.detail && (
                              <p className="mt-1 break-words text-sm text-muted-foreground">
                                {check.detail}
                              </p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Chip icon={Monitor}>{check.viewport}</Chip>
                              <Chip icon={Ruler}>
                                {check.width}×{check.height} px
                              </Chip>
                              <Chip icon={ZoomIn}>{Math.round(check.zoom * 100)}% text zoom</Chip>
                              {check.lastFailedAt && (
                                <Chip icon={Clock}>last failed {when(check.lastFailedAt)}</Chip>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                failed
                                  ? "bg-destructive text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {failed ? "Fail" : "Pass"}
                            </span>
                            <button
                              type="button"
                              aria-expanded={open}
                              aria-controls={`fix-${id}`}
                              onClick={() => {
                                setOpenId(open ? null : id);
                                if (!open) run.mutate(suite.id);
                              }}
                              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
                            >
                              <Wrench className="size-4" aria-hidden="true" />
                              Fix
                              <ChevronDown
                                className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
                                aria-hidden="true"
                              />
                            </button>
                          </div>
                        </div>

                        {open && (
                          <div
                            id={`fix-${id}`}
                            className="mt-3 min-w-0 rounded-lg border border-border bg-muted/40 p-3"
                          >
                            <h3 className="text-sm font-semibold">How to fix this</h3>
                            <p className="mt-1 break-words text-sm text-muted-foreground">
                              {fixAdvice(check)}
                            </p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              Usually lives in {section.label} ·{" "}
                              <Link
                                to="/"
                                hash={section.hash}
                                className="underline underline-offset-4"
                              >
                                open that section
                              </Link>
                            </p>

                            <div aria-live="polite" className="mt-3">
                              {busy && (
                                <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                                  <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
                                  Re-running {suite.title}…
                                </p>
                              )}
                              {!busy && run.isError && (
                                <p role="alert" className="text-sm text-destructive">
                                  Could not start the test run. Try again, or run it from your terminal.
                                </p>
                              )}
                              {!busy && result?.unavailable && (
                                <p className="break-words text-sm text-muted-foreground">
                                  {result.unavailable}
                                </p>
                              )}
                              {!busy && result?.output && (
                                <>
                                  <p className="text-sm font-medium">
                                    {result.ok ? "All checks in this suite pass now." : "Latest run output"}
                                  </p>
                                  <pre className="mt-2 max-h-72 overflow-auto rounded-md bg-background p-3 text-xs leading-relaxed">
                                    {result.output}
                                  </pre>
                                </>
                              )}
                              <p className="mt-2 break-words text-xs text-muted-foreground">
                                Command:{" "}
                                <code className="rounded bg-muted px-1 py-0.5">
                                  python3 tests/a11y/run_all.py {suite.id}
                                </code>
                              </p>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ),
          )}

        {data && suites.every((s) => s.checks.length === 0) && (
          <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
            No checks match this filter.
          </p>
        )}
      </div>
    </main>
  );
}
