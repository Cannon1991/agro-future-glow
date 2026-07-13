import { createFileRoute } from "@tanstack/react-router";
import {
  Satellite,
  CloudRain,
  Sprout,
  Leaf,
  TrendingUp,
  ShieldCheck,
  Recycle,
  Cog,
  Bug,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  CheckCircle2,
  Globe2,
  BarChart3,
} from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import farmerAppImg from "@/assets/farmer-app.jpg";
import satelliteImg from "@/assets/satellite.jpg";
import weatherImg from "@/assets/weather.jpg";
import analyticsImg from "@/assets/analytics.jpg";
import diseaseImg from "@/assets/disease.jpg";
import communityImg from "@/assets/community.jpg";
import { InteractiveDemo } from "@/components/InteractiveDemo";

export const Route = createFileRoute("/")({
  head: () => ({
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "AgroPulse Fix",
          url: "/",
          email: "godstimeenang4@gmail.com",
          telephone: "+2348063353863",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Ado",
            addressRegion: "Ekiti State",
            addressCountry: "NG",
          },
          description:
            "AI-powered digital agriculture using satellite data, weather models and predictive analytics to improve yields, detect disease early and secure food production.",
        }),
      },
    ],
  }),
  component: Index,
});

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
        <Leaf className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
      </div>
      <span className="text-lg font-bold tracking-tight text-foreground">
        AgroPulse <span className="text-primary">Fix</span>
      </span>
    </div>
  );
}

function Nav() {
  const links = [
    { href: "#platform", label: "Platform" },
    { href: "#dashboard", label: "Dashboard" },
    { href: "#impact", label: "Impact" },
    { href: "#contact", label: "Contact" },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Logo />
        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {l.label}
            </a>
          ))}
        </div>
        <a
          href="#contact"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] transition-transform hover:scale-105"
        >
          Get Started <ArrowRight className="h-4 w-4" />
        </a>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroImg}
          alt="Aerial view of Nigerian farmland at sunrise with satellite grid overlay"
          width={1920}
          height={1080}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[image:var(--gradient-hero)] opacity-85" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-md">
            <Satellite className="h-3.5 w-3.5" /> Satellite • Weather • AI
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Feed the future with{" "}
            <span className="bg-gradient-to-r from-[oklch(0.85_0.18_90)] to-[oklch(0.78_0.17_130)] bg-clip-text text-transparent">
              precision agriculture
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/85 sm:text-xl">
            AgroPulse Fix turns satellite imagery, weather models and predictive
            AI into daily guidance for farmers in villages, local governments
            and states across Nigeria — helping the world feed 8 billion people
            and counting.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="#dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-base font-semibold text-foreground shadow-[var(--shadow-elevated)] transition-transform hover:scale-105"
            >
              See the Dashboard <ArrowRight className="h-5 w-5" />
            </a>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/5 px-6 py-3.5 text-base font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/15"
            >
              Talk to our team
            </a>
          </div>
          <dl className="mt-14 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { v: "2×", l: "Yield uplift" },
              { v: "30%", l: "Less waste" },
              { v: "72h", l: "Early disease alerts" },
              { v: "50+", l: "Crop varieties" },
            ].map((s) => (
              <div key={s.l}>
                <dt className="text-3xl font-bold text-white sm:text-4xl">{s.v}</dt>
                <dd className="mt-1 text-sm text-white/70">{s.l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

function TrustBar() {
  return (
    <section className="border-y border-border bg-secondary/40">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 py-6 text-sm text-muted-foreground sm:px-6 lg:px-8">
        <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Backed by satellite science</span>
        <span className="inline-flex items-center gap-2"><Globe2 className="h-4 w-4 text-primary" /> Built for African smallholders</span>
        <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Trusted by cooperatives & LGAs</span>
        <span className="inline-flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Peer‑reviewed AI models</span>
      </div>
    </section>
  );
}

function Platform() {
  const items = [
    {
      icon: Satellite,
      title: "Parcel discovery from space",
      desc: "Detect every crop parcel in a village, LGA or state — even where cadastral maps don't exist — using multi‑spectral satellite imagery.",
      img: satelliteImg,
    },
    {
      icon: CloudRain,
      title: "Weather + rainfall intelligence",
      desc: "Meteorological models fused with historical rainfall tell farmers which crops fit their soil and season — before they plant.",
      img: weatherImg,
    },
    {
      icon: Bug,
      title: "Early disease detection",
      desc: "We know how a healthy crop grows. When development deviates, our AI flags the parcel days before the eye can see it — saving entire harvests.",
      img: diseaseImg,
    },
    {
      icon: BarChart3,
      title: "Predictive yield analytics",
      desc: "Field trials pair fertilizer recipes with soil and weather signals. Optimized inputs have doubled yields in pilot plots.",
      img: analyticsImg,
    },
  ];
  return (
    <section id="platform" className="bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-primary">The Platform</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            One AI stack. Every step of the growing cycle.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From mapping the land to harvesting the yield — AgroPulse Fix
            watches, learns and advises so farmers never grow alone.
          </p>
        </div>
        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          {items.map((it) => (
            <article
              key={it.title}
              className="group overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)]"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <img
                  src={it.img}
                  alt={it.title}
                  loading="lazy"
                  width={1280}
                  height={800}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/20 to-transparent" />
                <div className="absolute left-5 top-5 grid h-11 w-11 place-items-center rounded-xl bg-background/95 shadow-md backdrop-blur">
                  <it.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="p-7">
                <h3 className="text-xl font-semibold text-foreground">{it.title}</h3>
                <p className="mt-2 text-muted-foreground">{it.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function AimCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof TrendingUp;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-1">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function Dashboard() {
  const aims = [
    { icon: TrendingUp, title: "Improve yields", desc: "AI‑tuned fertilizer & planting windows lift harvests — often doubling them." },
    { icon: Recycle, title: "Reduce waste", desc: "Right input, right parcel, right day — cut over‑application and post‑harvest loss." },
    { icon: Cog, title: "Optimize operations", desc: "Coordinate labour, irrigation and logistics from one intelligent workspace." },
    { icon: CloudRain, title: "Predict weather", desc: "Localized forecasts protect crops from drought, floods and heat stress." },
    { icon: Bug, title: "Detect disease early", desc: "Growth‑pattern anomalies flag outbreaks before they spread — securing food supply." },
  ];
  return (
    <section id="dashboard" className="relative overflow-hidden bg-[image:var(--gradient-earth)] py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-primary">The Dashboard</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            Five aims. One farmer‑first view.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Every insight is engineered around outcomes that matter to farmers,
            cooperatives and governments securing tomorrow's food.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-5 lg:grid-rows-2">
          <div className="lg:col-span-3 lg:row-span-2">
            <div className="relative h-full overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-elevated)]">
              <img
                src={analyticsImg}
                alt="AgroPulse Fix predictive analytics dashboard"
                loading="lazy"
                width={1280}
                height={960}
                className="h-full w-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/90 to-transparent p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Live dashboard</p>
                <p className="mt-1 text-xl font-semibold text-white">Yields, weather & disease — one glance</p>
              </div>
            </div>
          </div>
          {aims.map((a) => (
            <AimCard key={a.title} {...a} />
          ))}
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <figure className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)]">
            <img
              src={satelliteImg}
              alt="Satellite parcel detection across Nigeria"
              loading="lazy"
              width={1280}
              height={960}
              className="aspect-[16/10] w-full object-cover"
            />
            <figcaption className="p-5 text-sm text-muted-foreground">
              Satellite parcel mapping — every farm, visible from Ekiti to Kano.
            </figcaption>
          </figure>
          <figure className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)]">
            <img
              src={weatherImg}
              alt="West African weather model output"
              loading="lazy"
              width={1280}
              height={960}
              className="aspect-[16/10] w-full object-cover"
            />
            <figcaption className="p-5 text-sm text-muted-foreground">
              Hyper‑local weather models — protect crops before the storm hits.
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", icon: Satellite, title: "Map", desc: "Satellites detect every parcel in your region." },
    { n: "02", icon: CloudRain, title: "Model", desc: "Weather + soil data recommend the right crop." },
    { n: "03", icon: Sprout, title: "Monitor", desc: "AI watches growth daily and flags anomalies." },
    { n: "04", icon: TrendingUp, title: "Multiply", desc: "Optimized fertilizer & timing boost the harvest." },
  ];
  return (
    <section className="bg-secondary/40 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-primary">How it works</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            From orbit to harvest in four steps.
          </h2>
        </div>
        <ol className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n} className="relative rounded-3xl border border-border bg-card p-7 shadow-[var(--shadow-soft)]">
              <span className="text-sm font-bold text-primary">{s.n}</span>
              <s.icon className="mt-4 h-7 w-7 text-primary" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Impact() {
  return (
    <section id="impact" className="bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div className="relative">
            <img
              src={communityImg}
              alt="Nigerian farmers reviewing crop data with an agronomist"
              loading="lazy"
              width={1536}
              height={1024}
              className="rounded-3xl object-cover shadow-[var(--shadow-elevated)]"
            />
            <img
              src={farmerAppImg}
              alt="Farmer using AgroPulse Fix mobile app in a maize field"
              loading="lazy"
              width={1536}
              height={1024}
              className="absolute -bottom-10 -right-6 hidden w-2/3 rounded-2xl border-4 border-background object-cover shadow-[var(--shadow-elevated)] md:block"
            />
          </div>
          <div>
            <span className="text-sm font-semibold uppercase tracking-widest text-primary">Impact</span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
              Better outcomes for farmers, villages, states and nations.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              The world will soon be home to more than 8 billion people. To feed
              them, agriculture must become smarter, faster and fairer.
              AgroPulse Fix equips every layer — from a farmer in Ekiti to a
              ministry of agriculture — with the same trusted data.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                "Villages: shared advisory in local languages via SMS & mobile.",
                "Local governments: parcel registries, subsidy targeting, extension services.",
                "State & federal: food‑security dashboards and early‑warning systems.",
                "Global partners: exportable, standards‑based agri‑intelligence.",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                  <span className="text-foreground">{t}</span>
                </li>
              ))}
            </ul>
            <a
              href="#contact"
              className="mt-10 inline-flex items-center gap-2 rounded-full bg-[image:var(--gradient-primary)] px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:scale-105"
            >
              Partner with AgroPulse Fix <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Contact() {
  const items: Array<{ icon: typeof MapPin; label: string; value: string; href?: string }> = [
    { icon: MapPin, label: "Office", value: "Ado, Ekiti State, Nigeria" },
    { icon: Phone, label: "Phone", value: "+234 806 335 3863", href: "tel:+2348063353863" },
    { icon: Mail, label: "Email", value: "godstimeenang4@gmail.com", href: "mailto:godstimeenang4@gmail.com" },
  ];
  return (
    <section id="contact" className="relative overflow-hidden bg-foreground py-24 text-background sm:py-32">
      <div className="absolute inset-0 opacity-20">
        <img src={heroImg} alt="" width={1920} height={1080} className="h-full w-full object-cover" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <span className="text-sm font-semibold uppercase tracking-widest text-[oklch(0.78_0.17_130)]">Contact</span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
              Let's grow the future together.
            </h2>
            <p className="mt-4 max-w-xl text-lg text-background/80">
              Reach out to bring AgroPulse Fix to your farm, cooperative, local
              government or ministry. We reply within 24 hours.
            </p>
          </div>
          <div className="space-y-5">
            {items.map((c) => {
              const className =
                "flex items-start gap-4 rounded-2xl border border-background/15 bg-background/5 p-5 backdrop-blur-md transition-colors hover:bg-background/10";
              const content = (
                <>
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-[image:var(--gradient-primary)]">
                    <c.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-background/60">{c.label}</p>
                    <p className="mt-1 text-lg font-medium">{c.value}</p>
                  </div>
                </>
              );
              return c.href ? (
                <a key={c.label} href={c.href} className={className}>{content}</a>
              ) : (
                <div key={c.label} className={className}>{content}</div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-background py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
        <Logo />
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} AgroPulse Fix. Feeding the future with AI.
        </p>
      </div>
    </footer>
  );
}

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main>
        <Hero />
        <TrustBar />
        <Platform />
        <Dashboard />
        <HowItWorks />
        <Impact />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
