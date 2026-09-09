import { useEffect, useState } from "react";
import { Download, Share, CheckCircle2, WifiOff } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallApp() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent));
    setOffline(!window.navigator.onLine);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* offline support unavailable; the site still works online */
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setDeferred(null);
  };

  return (
    <section id="app" aria-labelledby="app-title" className="pt-14">
      <h2 id="app-title" className="text-2xl font-bold tracking-tight text-foreground">
        Install the app
      </h2>
      <p className="mt-3 text-sm text-muted-foreground">
        AgroPulse Fix installs straight onto a phone — no app store account, no
        download charges. It opens full screen like any other app and the last
        pages you opened still load when the network drops.
      </p>

      {offline ? (
        <p
          role="status"
          className="mt-4 flex items-start gap-2 rounded-2xl border border-border bg-secondary/50 p-4 text-sm text-foreground"
        >
          <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          You are offline right now. You are reading a saved copy of this page.
        </p>
      ) : null}

      {installed ? (
        <p
          role="status"
          className="mt-4 flex items-start gap-2 rounded-2xl border border-border bg-card p-4 text-sm text-foreground"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          AgroPulse Fix is installed on this phone. Open it from your home
          screen any time.
        </p>
      ) : deferred ? (
        <button
          type="button"
          onClick={install}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-base font-semibold text-primary-foreground"
        >
          <Download className="h-5 w-5 shrink-0" />
          Add AgroPulse Fix to my phone
        </button>
      ) : isIOS ? (
        <p className="mt-5 flex items-start gap-2 rounded-2xl border border-border bg-card p-4 text-sm text-foreground">
          <Share className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          On iPhone: tap the Share button in Safari, then choose “Add to Home
          Screen”.
        </p>
      ) : (
        <p className="mt-5 rounded-2xl border border-border bg-card p-4 text-sm text-foreground">
          Open this page in Chrome on an Android phone and choose “Install app”
          or “Add to Home screen” from the browser menu.
        </p>
      )}

      <ul className="mt-5 space-y-3">
        {[
          "Works on entry-level Android phones and iPhones — nothing to buy.",
          "Pages you have already opened stay readable with no network.",
          "Field officers, council staff and state teams all use the same link.",
        ].map((t) => (
          <li key={t} className="flex min-w-0 gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <span className="min-w-0 break-words text-sm text-foreground">{t}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
