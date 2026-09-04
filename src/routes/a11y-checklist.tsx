import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Monitor, RefreshCw, Ruler, ZoomIn } from "lucide-react";

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
  const { data, isLoading, isFetching, error, refetch } = useQuery<Report>({
    queryKey: ["a11y-report"],
    queryFn: async () => {
      const res = await fetch(`/a11y-report.json?t=${Date.now()}`);
      if (!res.ok) throw new Error("No report found");
      return res.json();
    },
    refetchInterval: 15000,
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
            Every check we run, grouped by suite, with its current status. Last run{" "}
            {when(data?.generatedAt)}.
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
                    return (
                      <li
                        key={`${suite.id}-${i}`}
                        className={`flex min-w-0 items-start gap-3 rounded-xl border p-3 ${
                          failed ? "border-destructive/40 bg-destructive/[0.04]" : "border-border"
                        }`}
                      >
                        {failed ? (
                          <AlertTriangle
                            className="mt-0.5 size-4 shrink-0 text-destructive"
                            aria-hidden="true"
                          />
                        ) : (
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-medium">
                            <span className="sr-only">{failed ? "Failing: " : "Passing: "}</span>
                            {check.name}
                          </p>
                          {failed && check.detail && (
                            <p className="mt-1 break-words text-sm text-muted-foreground">{check.detail}</p>
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
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                            failed
                              ? "bg-destructive text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {failed ? "Fail" : "Pass"}
                        </span>
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
