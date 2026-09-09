import { createFileRoute } from "@tanstack/react-router";
import {
  Satellite,
  CloudRain,
  Bug,
  TrendingUp,
  Leaf,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import { InstallApp } from "@/components/InstallApp";


export const Route = createFileRoute("/mobile")({
  head: () => ({
    meta: [
      { title: "AgroPulse Fix Mobile — Farm intelligence in your pocket" },
      {
        name: "description",
        content:
          "A fast, simplified mobile view of AgroPulse Fix: satellite parcel mapping, weather models and early disease alerts for farmers across Nigeria.",
      },
      { property: "og:title", content: "AgroPulse Fix Mobile — Farm intelligence in your pocket" },
      {
        property: "og:description",
        content:
          "Simplified mobile-first view of AgroPulse Fix precision agriculture: parcels, weather, disease alerts and yield guidance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/mobile" }],
  }),
  component: MobilePage,
});

const features = [
  {
    icon: Satellite,
    title: "See every plot on a map",
    desc: "We draw the boundaries of the farms around you from satellite images, so you can point at a plot instead of describing it.",
  },
  {
    icon: CloudRain,
    title: "Rain and planting windows",
    desc: "Local rainfall and temperature forecasts for your ward, turned into a simple answer: plant now, or wait.",
  },
  {
    icon: Bug,
    title: "Early warning on sick crops",
    desc: "When a patch of your field starts growing differently from the rest, we flag it while the leaves still look fine.",
  },
  {
    icon: TrendingUp,
    title: "Fertilizer you don't waste",
    desc: "Guidance on how much to apply, and where, based on how each part of your field is actually performing.",
  },
];

const steps = [
  "Tell us your village, local government or state — nothing else to fill in.",
  "We pull recent satellite images for that area and outline the farm plots.",
  "You receive planting, weather and crop-health guidance on your phone.",
];

const crops = ["Maize", "Rice", "Cassava", "Yam", "Sorghum", "Cowpea", "Cocoa", "Oil palm"];

const contacts: Array<{ icon: typeof MapPin; label: string; value: string; href?: string }> = [
  { icon: MapPin, label: "Office", value: "Ado, Ekiti State, Nigeria" },
  { icon: Phone, label: "Phone", value: "+234 806 335 3863", href: "tel:+2348063353863" },
  { icon: Mail, label: "Email", value: "godstimeenang4@gmail.com", href: "mailto:godstimeenang4@gmail.com" },
];


function MobilePage() {
  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:inline-flex focus:min-h-11 focus:min-w-11 focus:items-center focus:rounded-lg focus:bg-primary focus:px-4 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <nav
          aria-label="Primary"
          className="mx-auto grid max-w-screen-sm grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[image:var(--gradient-primary)]">
              <Leaf className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            </span>
            <span className="truncate text-base font-bold tracking-tight text-foreground">
              AgroPulse <span className="text-primary">Fix</span>
            </span>
          </div>
          <a
            href="#contact"
            className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Contact
          </a>
        </nav>
      </header>

      <main id="main" className="mx-auto max-w-screen-sm px-4 pb-16">
        <section aria-labelledby="hero-title" className="pt-8">
          <h1
            id="hero-title"
            className="text-3xl font-bold leading-tight tracking-tight text-foreground"
          >
            Precision farming, simplified for your phone.
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Type your village, local government or state and AgroPulse Fix maps
            the farm plots around you from satellite imagery, then sends
            planting, rainfall and crop-health guidance in plain language.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <a
              href="#how"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-base font-semibold text-primary-foreground"
            >
              See how it works <ArrowRight className="h-5 w-5 shrink-0" />
            </a>
            <a
              href="#contact"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-5 text-base font-semibold text-foreground"
            >
              Talk to our team
            </a>
          </div>
          <img
            src={heroImg}
            alt="Aerial view of Nigerian farmland at sunrise"
            width={1920}
            height={1080}
            className="mt-8 aspect-[4/3] w-full rounded-2xl object-cover"
          />
          <h2 className="mt-8 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Crops we cover today
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {crops.map((c) => (
              <li
                key={c}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground"
              >
                {c}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            Coverage runs across all 36 states and the FCT, with guidance
            written for smallholder farms of one hectare and up.
          </p>
        </section>


        <section aria-labelledby="features-title" className="pt-14">
          <h2 id="features-title" className="text-2xl font-bold tracking-tight text-foreground">
            What you get
          </h2>
          <ul className="mt-6 space-y-4">
            {features.map((f) => (
              <li
                key={f.title}
                className="flex min-w-0 gap-4 rounded-2xl border border-border bg-card p-5"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-foreground">{f.title}</h3>
                  <p className="mt-1 break-words text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section id="how" aria-labelledby="how-title" className="pt-14">
          <h2 id="how-title" className="text-2xl font-bold tracking-tight text-foreground">
            How it works
          </h2>
          <ol className="mt-6 space-y-4">
            {steps.map((s, i) => (
              <li key={s} className="flex min-w-0 gap-4 rounded-2xl bg-secondary/50 p-5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <p className="min-w-0 break-words text-sm text-foreground">{s}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="impact-title" className="pt-14">
          <h2 id="impact-title" className="text-2xl font-bold tracking-tight text-foreground">
            Built for food security
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            The same maps that help a single farmer plan a season help a local
            government plan a harvest. AgroPulse Fix is built to be shared.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "Advice sent as short mobile messages, so it works on a basic phone with no data plan.",
              "Plot registries local governments can use to reach the right farmers with seed and fertilizer support.",
              "Season-by-season harvest outlooks for state agriculture teams planning storage and supply.",
            ].map((t) => (
              <li key={t} className="flex min-w-0 gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="min-w-0 break-words text-sm text-foreground">{t}</span>
              </li>
            ))}
          </ul>
        </section>

        <InstallApp />



        <section id="contact" aria-labelledby="contact-title" className="pt-14">
          <h2 id="contact-title" className="text-2xl font-bold tracking-tight text-foreground">
            Contact us
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Call or send a message about your farm, your local government or a
            programme you run. Messages go straight to our team in Ado, Ekiti
            State, and we answer in the order they arrive.
          </p>

          <ul className="mt-6 space-y-3">
            {contacts.map((c) => {
              const inner = (
                <>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10">
                    <c.icon className="h-5 w-5 text-primary" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {c.label}
                    </span>
                    <span className="mt-0.5 block break-words text-base font-medium text-foreground">
                      {c.value}
                    </span>
                  </span>
                </>
              );
              return (
                <li key={c.label}>
                  {c.href ? (
                    <a
                      href={c.href}
                      className="flex min-h-11 min-w-0 items-center gap-4 rounded-2xl border border-border bg-card p-4"
                    >
                      {inner}
                    </a>
                  ) : (
                    <div className="flex min-w-0 items-center gap-4 rounded-2xl border border-border bg-card p-4">
                      {inner}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </main>

      <footer className="border-t border-border bg-background px-4 py-8">
        <div className="mx-auto flex max-w-screen-sm flex-col gap-3">
          <a href="/" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">
            View the full desktop site
          </a>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} AgroPulse Fix. Feeding the future with AI.
          </p>
        </div>
      </footer>
    </div>
  );
}
