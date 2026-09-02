import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Monitor,
  RefreshCw,
  Ruler,
  ZoomIn,
} from "lucide-react";

export const Route = createFileRoute("/a11y")({
  head: () => ({
    meta: [
      { title: "Accessibility Regression Dashboard — AgroPulse Fix" },
      {
        name: "description",
        content:
          "Live view of AgroPulse Fix accessibility checks: which viewport, zoom level and screen size each test last failed at.",
      },
      { property: "og:title", content: "Accessibility Regression Dashboard — AgroPulse Fix" },
      {
        property: "og:description",
        content:
          "Track failing accessibility checks by viewport, zoom and screen width so real issues get fixed, not re-run.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: A11yDashboard,
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
  status: "pass" | "fail" | "error" | "skipped";
  ranAt: string | null;
  error?: string | null;
  checks: Check[];
};

type Report = {
  generatedAt: string;
  suites: Suite[];
  totals: { checks: number; failing: number; suites: number; failingSuites: number };
};

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

function A11yDashboard() {
  const { data, isLoading, isFetching, error, refetch } = useQuery<Report>({
    queryKey: ["a11y-report"],
    queryFn: async () => {
      const res = await fetch(`/a11y-report.json?t=${Date.now()}`);
      if (!res.ok) throw new Error("No report found");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const suites = data?.suites ?? [];
  const failing = suites
    .flatMap((s) => s.checks.map((c) => ({ suite: s, check: c })))
    .filter((r) => r.check.status === "fail");
  const previouslyFailed = suites
    .flatMap((s) => s.checks.map((c) => ({ suite: s, check: c })))
    .filter((r) => r.check.status === "pass" && r.check.lastFailedAt);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap gap-4 text-sm">
        <Link to="/" className="text-muted-foreground underline-offset-4 hover:underline">
          ← Back to AgroPulse Fix
        </Link>
        <Link to="/a11y-fixes" className="text-muted-foreground underline-offset-4 hover:underline">
          Fix list
        </Link>
      </nav>

      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Accessibility regression dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Every check, with the viewport, screen size and text zoom it last failed at. Regenerate
            with <code className="rounded bg-muted px-1 py-0.5">python3 tests/a11y/run_all.py</code>.
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
              Run <code className="rounded bg-muted px-1 py-0.5">python3 tests/a11y/run_all.py</code>{" "}
              to generate <code>public/a11y-report.json</code>, then refresh this page.
            </p>
          </div>
        )}

        {data && (
          <>
            <section aria-label="Summary" className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Checks", value: data.totals.checks },
                { label: "Failing now", value: data.totals.failing },
                { label: "Suites", value: data.totals.suites },
                { label: "Failing suites", value: data.totals.failingSuites },
              ].map((s) => (
                <div key={s.label} className="min-w-0 rounded-xl border border-border p-4">
                  <p className="text-2xl font-semibold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </section>
            <p className="mb-8 text-xs text-muted-foreground">
              Last run {when(data.generatedAt)}.
            </p>

            <section aria-labelledby="failing-now" className="mb-10">
              <h2 id="failing-now" className="mb-3 text-lg font-semibold">
                Failing now ({failing.length})
              </h2>
              {failing.length === 0 ? (
                <p className="inline-flex items-center gap-2 rounded-lg border border-border p-4 text-sm">
                  <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
                  All checks pass in the latest run.
                </p>
              ) : (
                <ul className="space-y-3">
                  {failing.map(({ suite, check }, i) => (
                    <li
                      key={`${suite.id}-${i}`}
                      className="min-w-0 rounded-xl border border-destructive/40 bg-destructive/[0.04] p-4"
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle
                          className="mt-0.5 size-4 shrink-0 text-destructive"
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="break-words font-medium">{check.name}</p>
                          {check.detail && (
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
                            <Chip icon={Clock}>{when(check.lastFailedAt ?? check.lastRunAt)}</Chip>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {suite.title} · {suite.file}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="recently-fixed" className="mb-10">
              <h2 id="recently-fixed" className="mb-3 text-lg font-semibold">
                Passing now, failed before ({previouslyFailed.length})
              </h2>
              {previouslyFailed.length === 0 ? (
                <p className="text-sm text-muted-foreground">No previously recorded failures.</p>
              ) : (
                <ul className="space-y-2">
                  {previouslyFailed.map(({ suite, check }, i) => (
                    <li
                      key={`${suite.id}-fixed-${i}`}
                      className="min-w-0 rounded-lg border border-border p-3 text-sm"
                    >
                      <p className="break-words font-medium">{check.name}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Chip icon={Monitor}>{check.lastFailedViewport ?? check.viewport}</Chip>
                        <Chip icon={Ruler}>{check.lastFailedSize ?? "—"}</Chip>
                        <Chip icon={ZoomIn}>
                          {Math.round((check.lastFailedZoom ?? check.zoom) * 100)}% text zoom
                        </Chip>
                        <Chip icon={Clock}>last failed {when(check.lastFailedAt)}</Chip>
                      </div>
                      {check.lastFailureDetail && (
                        <p className="mt-2 break-words text-xs text-muted-foreground">
                          {check.lastFailureDetail}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="all-suites">
              <h2 id="all-suites" className="mb-3 text-lg font-semibold">
                Suites
              </h2>
              <ul className="space-y-2">
                {suites.map((s) => {
                  const failed = s.checks.filter((c) => c.status === "fail").length;
                  return (
                    <li
                      key={s.id}
                      className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="break-words font-medium">{s.title}</p>
                        <p className="text-xs text-muted-foreground">{s.file}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Chip icon={Clock}>{s.ranAt ? when(s.ranAt) : "not run"}</Chip>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            s.status === "pass"
                              ? "bg-primary/10 text-primary"
                              : s.status === "skipped"
                                ? "bg-muted text-muted-foreground"
                                : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {s.status === "pass"
                            ? `${s.checks.length} passing`
                            : s.status === "skipped"
                              ? "skipped"
                              : s.status === "error"
                                ? "suite error"
                                : `${failed} failing`}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
