import { createFileRoute, Link } from "@tanstack/react-router";
import { WifiOff, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/offline")({
  head: () => ({
    meta: [
      { title: "Offline — AgroPulse Fix" },
      {
        name: "description",
        content:
          "You are offline. Saved AgroPulse Fix pages still open; new maps and guidance load again once your phone has network.",
      },
      { property: "og:title", content: "Offline — AgroPulse Fix" },
      {
        property: "og:description",
        content: "Saved AgroPulse Fix pages still open while your phone has no network.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OfflinePage,
});

function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-screen-sm flex-col justify-center px-4 py-12">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10">
        <WifiOff className="h-6 w-6 text-primary" />
      </span>
      <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">
        You are offline
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Your phone has no network right now. Pages you opened earlier are saved
        and still work. New parcel maps and weather guidance will load again as
        soon as you have signal.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-base font-semibold text-primary-foreground"
        >
          <RefreshCw className="h-5 w-5 shrink-0" /> Try again
        </button>
        <Link
          to="/mobile"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-5 text-base font-semibold text-foreground"
        >
          Go to the saved home page
        </Link>
      </div>
    </main>
  );
}
