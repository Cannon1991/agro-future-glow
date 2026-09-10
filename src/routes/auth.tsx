import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Leaf, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Team sign in — AgroPulse Fix" },
      {
        name: "description",
        content:
          "Sign in to the AgroPulse Fix team area to update the figures and alerts shown to farmers, councils and state teams.",
      },
      { property: "og:title", content: "Team sign in — AgroPulse Fix" },
      {
        property: "og:description",
        content: "Sign in to update AgroPulse Fix figures and alerts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) navigate({ to: "/admin", replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        navigate({ to: "/admin", replace: true });
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (err) throw err;
        if (data.session) {
          navigate({ to: "/admin", replace: true });
        } else {
          setNotice("Check your email and click the confirmation link to finish creating your account.");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    setError(null);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError("Google sign in did not complete. Please try again.");
        setBusy(false);
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/admin", replace: true });
    } catch {
      setError("Google sign in did not complete. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <main id="main" className="mx-auto w-full max-w-screen-sm flex-1 px-4 py-10">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[image:var(--gradient-primary)]">
            <Leaf className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </span>
          <span className="text-base font-bold tracking-tight text-foreground">
            AgroPulse <span className="text-primary">Fix</span>
          </span>
        </div>

        <h1 className="mt-8 text-3xl font-bold tracking-tight text-foreground">
          {mode === "signin" ? "Team sign in" : "Create your team account"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This area is for the AgroPulse Fix team. Sign in to update the figures
          and alerts that farmers, councils and state teams see.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-foreground">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 block min-h-11 w-full rounded-xl border border-border bg-card px-4 text-base text-foreground"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 block min-h-11 w-full rounded-xl border border-border bg-card px-4 text-base text-foreground"
            />
            <p className="mt-2 text-sm text-muted-foreground">At least 8 characters.</p>
          </div>

          {error ? (
            <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p role="status" className="rounded-xl border border-border bg-secondary/50 p-3 text-sm text-foreground">
              {notice}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-base font-semibold text-primary-foreground disabled:opacity-70"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-border px-5 text-base font-semibold text-foreground disabled:opacity-70"
        >
          Continue with Google
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setNotice(null);
          }}
          className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-primary"
        >
          {mode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}
        </button>

        <div className="mt-8">
          <Link to="/mobile" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">
            Back to the mobile page
          </Link>
        </div>
      </main>
    </div>
  );
}
