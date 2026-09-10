import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Leaf, Loader2, Plus, Trash2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — AgroPulse Fix" },
      {
        name: "description",
        content:
          "Update the figures and alerts shown on the AgroPulse Fix mobile page.",
      },
      { property: "og:title", content: "Admin dashboard — AgroPulse Fix" },
      { property: "og:description", content: "Update AgroPulse Fix figures and alerts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Metric = {
  id: string;
  label: string;
  value: string;
  description: string;
  sort_order: number;
};

type Alert = {
  id: string;
  title: string;
  message: string;
  level: string;
  published: boolean;
  sort_order: number;
};

const inputClass =
  "mt-1 block min-h-11 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground";

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const access = useQuery({
    queryKey: ["admin-access"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return { isAdmin: false, email: "" };
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      return { isAdmin: Boolean(data), email: user.email ?? "" };
    },
  });

  const metrics = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from("site_metrics")
        .select("id,label,value,description,sort_order")
        .order("sort_order", { ascending: true });
      if (err) throw err;
      return (data ?? []) as Metric[];
    },
  });

  const alerts = useQuery({
    queryKey: ["admin-alerts"],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from("site_alerts")
        .select("id,title,message,level,published,sort_order")
        .order("sort_order", { ascending: true });
      if (err) throw err;
      return (data ?? []) as Alert[];
    },
  });

  async function run(key: string, fn: () => Promise<void>, done: string) {
    setSaving(key);
    setError(null);
    setStatus(null);
    try {
      await fn();
      setStatus(done);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That change could not be saved.");
    } finally {
      setSaving(null);
    }
  }

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
    queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
    queryClient.invalidateQueries({ queryKey: ["public-metrics"] });
    queryClient.invalidateQueries({ queryKey: ["public-alerts"] });
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function claimAdmin() {
    await run(
      "claim",
      async () => {
        const { data, error: err } = await supabase.rpc("claim_first_admin");
        if (err) throw err;
        if (!data) throw new Error("An admin already exists. Ask them to give you access.");
        await queryClient.invalidateQueries({ queryKey: ["admin-access"] });
      },
      "You are now the admin.",
    );
  }

  if (access.isLoading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Loading your dashboard…
        </p>
      </div>
    );
  }

  if (!access.data?.isAdmin) {
    return (
      <div className="mx-auto min-h-dvh max-w-screen-sm bg-background px-4 py-12">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">No admin access yet</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          You are signed in as {access.data?.email || "an unknown account"}, but this
          account cannot edit the figures and alerts yet.
        </p>
        {error ? (
          <p role="alert" className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={claimAdmin}
          disabled={saving === "claim"}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-base font-semibold text-primary-foreground disabled:opacity-70"
        >
          <ShieldCheck className="h-5 w-5" aria-hidden="true" /> Make me the admin
        </button>
        <p className="mt-3 text-sm text-muted-foreground">
          This only works for the very first account. After that, an existing
          admin has to grant access.
        </p>
        <button
          type="button"
          onClick={signOut}
          className="mt-8 inline-flex min-h-11 items-center text-sm font-semibold text-primary"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-screen-sm items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[image:var(--gradient-primary)]">
              <Leaf className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            </span>
            <span className="truncate text-base font-bold tracking-tight text-foreground">Admin</span>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-border px-4 text-sm font-semibold text-foreground"
          >
            Sign out
          </button>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-screen-sm px-4 pb-20">
        <h1 className="pt-8 text-3xl font-bold tracking-tight text-foreground">
          Figures and alerts
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Anything you save here appears straight away on the mobile page.
        </p>

        <div aria-live="polite" className="mt-4 space-y-3">
          {status ? (
            <p className="rounded-xl border border-border bg-secondary/50 p-3 text-sm text-foreground">{status}</p>
          ) : null}
          {error ? (
            <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <section aria-labelledby="figures-title" className="pt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="figures-title" className="text-2xl font-bold tracking-tight text-foreground">
              Figures
            </h2>
            <button
              type="button"
              onClick={() =>
                run(
                  "new-metric",
                  async () => {
                    const next = (metrics.data?.length ?? 0) + 1;
                    const { error: err } = await supabase.from("site_metrics").insert({
                      label: "New figure",
                      value: "0",
                      description: "",
                      sort_order: next,
                    });
                    if (err) throw err;
                    refresh();
                  },
                  "Figure added.",
                )
              }
              disabled={saving === "new-metric"}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-70"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Add figure
            </button>
          </div>

          {metrics.isLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading figures…</p>
          ) : (
            <ul className="mt-6 space-y-4">
              {(metrics.data ?? []).map((m) => (
                <li key={m.id} className="rounded-2xl border border-border bg-card p-5">
                  <MetricEditor
                    metric={m}
                    busy={saving === m.id}
                    onSave={(next) =>
                      run(
                        m.id,
                        async () => {
                          const { error: err } = await supabase
                            .from("site_metrics")
                            .update(next)
                            .eq("id", m.id);
                          if (err) throw err;
                          refresh();
                        },
                        "Figure saved.",
                      )
                    }
                    onDelete={() =>
                      run(
                        m.id,
                        async () => {
                          const { error: err } = await supabase
                            .from("site_metrics")
                            .delete()
                            .eq("id", m.id);
                          if (err) throw err;
                          refresh();
                        },
                        "Figure removed.",
                      )
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="alerts-title" className="pt-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="alerts-title" className="text-2xl font-bold tracking-tight text-foreground">
              Alerts
            </h2>
            <button
              type="button"
              onClick={() =>
                run(
                  "new-alert",
                  async () => {
                    const next = (alerts.data?.length ?? 0) + 1;
                    const { error: err } = await supabase.from("site_alerts").insert({
                      title: "New alert",
                      message: "",
                      level: "info",
                      published: false,
                      sort_order: next,
                    });
                    if (err) throw err;
                    refresh();
                  },
                  "Alert added.",
                )
              }
              disabled={saving === "new-alert"}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-70"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Add alert
            </button>
          </div>

          {alerts.isLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading alerts…</p>
          ) : (
            <ul className="mt-6 space-y-4">
              {(alerts.data ?? []).map((a) => (
                <li key={a.id} className="rounded-2xl border border-border bg-card p-5">
                  <AlertEditor
                    alert={a}
                    busy={saving === a.id}
                    onSave={(next) =>
                      run(
                        a.id,
                        async () => {
                          const { error: err } = await supabase
                            .from("site_alerts")
                            .update(next)
                            .eq("id", a.id);
                          if (err) throw err;
                          refresh();
                        },
                        "Alert saved.",
                      )
                    }
                    onDelete={() =>
                      run(
                        a.id,
                        async () => {
                          const { error: err } = await supabase
                            .from("site_alerts")
                            .delete()
                            .eq("id", a.id);
                          if (err) throw err;
                          refresh();
                        },
                        "Alert removed.",
                      )
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="pt-12">
          <Link to="/mobile" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">
            View the mobile page
          </Link>
        </div>
      </main>
    </div>
  );
}

function MetricEditor({
  metric,
  busy,
  onSave,
  onDelete,
}: {
  metric: Metric;
  busy: boolean;
  onSave: (next: Omit<Metric, "id">) => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(metric.label);
  const [value, setValue] = useState(metric.value);
  const [description, setDescription] = useState(metric.description);
  const [sortOrder, setSortOrder] = useState(String(metric.sort_order));

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          label,
          value,
          description,
          sort_order: Number(sortOrder) || 0,
        });
      }}
    >
      <div>
        <label htmlFor={`label-${metric.id}`} className="text-sm font-semibold text-foreground">
          Name
        </label>
        <input
          id={`label-${metric.id}`}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor={`value-${metric.id}`} className="text-sm font-semibold text-foreground">
          Number
        </label>
        <input
          id={`value-${metric.id}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor={`desc-${metric.id}`} className="text-sm font-semibold text-foreground">
          Short explanation
        </label>
        <textarea
          id={`desc-${metric.id}`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-1 block w-full rounded-xl border border-border bg-background p-3 text-base text-foreground"
        />
      </div>
      <div>
        <label htmlFor={`order-${metric.id}`} className="text-sm font-semibold text-foreground">
          Position
        </label>
        <input
          id={`order-${metric.id}`}
          type="number"
          inputMode="numeric"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-70"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Save figure
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 text-sm font-semibold text-destructive disabled:opacity-70"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
        </button>
      </div>
    </form>
  );
}

function AlertEditor({
  alert,
  busy,
  onSave,
  onDelete,
}: {
  alert: Alert;
  busy: boolean;
  onSave: (next: Omit<Alert, "id">) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(alert.title);
  const [message, setMessage] = useState(alert.message);
  const [level, setLevel] = useState(alert.level);
  const [published, setPublished] = useState(alert.published);
  const [sortOrder, setSortOrder] = useState(String(alert.sort_order));

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          title,
          message,
          level,
          published,
          sort_order: Number(sortOrder) || 0,
        });
      }}
    >
      <div>
        <label htmlFor={`title-${alert.id}`} className="text-sm font-semibold text-foreground">
          Title
        </label>
        <input
          id={`title-${alert.id}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor={`message-${alert.id}`} className="text-sm font-semibold text-foreground">
          Message
        </label>
        <textarea
          id={`message-${alert.id}`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          required
          className="mt-1 block w-full rounded-xl border border-border bg-background p-3 text-base text-foreground"
        />
      </div>
      <div>
        <label htmlFor={`level-${alert.id}`} className="text-sm font-semibold text-foreground">
          Urgency
        </label>
        <select
          id={`level-${alert.id}`}
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className={inputClass}
        >
          <option value="info">Information</option>
          <option value="warning">Warning</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
      <div>
        <label htmlFor={`order-a-${alert.id}`} className="text-sm font-semibold text-foreground">
          Position
        </label>
        <input
          id={`order-a-${alert.id}`}
          type="number"
          inputMode="numeric"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="flex items-center gap-3">
        <input
          id={`published-${alert.id}`}
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          className="h-5 w-5 rounded border-border"
        />
        <label htmlFor={`published-${alert.id}`} className="text-sm font-semibold text-foreground">
          Show this alert on the mobile page
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-70"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Save alert
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 text-sm font-semibold text-destructive disabled:opacity-70"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
        </button>
      </div>
    </form>
  );
}
