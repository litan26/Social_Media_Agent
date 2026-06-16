import { Link } from 'react-router-dom';
import { PageBackground } from '../../components/ui/PageBackground';
import { MarketingNav } from '../../components/ui/MarketingNav';
import { SiteFooter } from '../../components/ui/SiteFooter';
import { IconSparkle, IconGlobe, IconChart, IconBolt, IconShield } from '../../components/ui/Icons';

const features = [
  {
    icon: IconSparkle,
    title: 'Claude AI variants',
    desc: 'Generate three tone-matched post variants for every topic in seconds.',
  },
  {
    icon: IconGlobe,
    title: 'Seven platforms',
    desc: 'Twitter, Instagram, LinkedIn, Facebook, TikTok, Pinterest, and YouTube — one dashboard.',
  },
  {
    icon: IconChart,
    title: 'Smart analytics',
    desc: 'Track engagement, surface insights, and refine your content strategy over time.',
  },
  {
    icon: IconBolt,
    title: 'Schedule & publish',
    desc: 'Publish instantly or queue posts for peak hours with built-in scheduling.',
  },
  {
    icon: IconShield,
    title: 'Secure & multi-tenant',
    desc: 'Each account is isolated with admin-managed access and JWT authentication.',
  },
];

const steps = [
  { num: '01', title: 'Create account', desc: 'Sign up with email and phone, then choose your plan.' },
  { num: '02', title: 'Connect & create', desc: 'Link social accounts on your dashboard and generate Claude-powered posts.' },
  { num: '03', title: 'Publish & learn', desc: 'Schedule content, track metrics, and refine your strategy.' },
];

export function LandingPage() {
  return (
    <div className="relative min-h-screen">
      <PageBackground />
      <MarketingNav />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pb-24 pt-16 md:pb-32 md:pt-24">
          <div className="hero-glow" />
          <div className="relative mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <span className="badge-violet mb-6 inline-flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
                </span>
                AI-Powered Social Management
              </span>
              <h1 className="font-display text-5xl font-bold leading-[1.08] tracking-tight md:text-7xl">
                <span className="text-gradient">Elevate</span> your social presence
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-400 md:text-xl">
                Connect accounts, generate premium content with Claude, schedule across platforms,
                and unlock insights that compound over time.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Link to="/register" className="btn-primary min-w-[180px]">
                  Get Started Free
                </Link>
                <Link to="/login" className="btn-ghost min-w-[180px]">
                  Sign In
                </Link>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Create an account in minutes — no credit card required for Free.
              </p>
            </div>

            {/* Dashboard preview mockup */}
            <div className="relative mx-auto mt-16 max-w-4xl">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-violet-600/20 via-fuchsia-600/10 to-cyan-600/20 blur-2xl" />
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0f]/90 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                  <span className="h-3 w-3 rounded-full bg-red-500/80" />
                  <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-4 text-xs text-slate-500">dashboard — AI Social Platform</span>
                </div>
                <div className="grid gap-4 p-6 md:grid-cols-3">
                  <div className="stat-card !p-4">
                    <p className="text-xs text-slate-500">Posts this month</p>
                    <p className="mt-1 font-display text-2xl font-bold text-white">24</p>
                  </div>
                  <div className="stat-card !p-4">
                    <p className="text-xs text-slate-500">Avg engagement</p>
                    <p className="mt-1 font-display text-2xl font-bold text-gradient">4.8%</p>
                  </div>
                  <div className="stat-card !p-4">
                    <p className="text-xs text-slate-500">Platforms connected</p>
                    <p className="mt-1 font-display text-2xl font-bold text-emerald-400">7</p>
                  </div>
                </div>
                <div className="border-t border-white/10 p-6">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Recent AI draft</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    "Excited to share our latest product update — built for teams who move fast and
                    create with purpose. 🚀 #ProductLaunch"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-white/[0.06] px-4 py-24">
          <div className="mx-auto max-w-6xl">
            <p className="section-label">Features</p>
            <h2 className="section-heading">Everything you need to grow</h2>
            <p className="section-subheading">
              From AI content creation to cross-platform publishing and analytics — all in one place.
            </p>
            <div className="stagger-children mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div key={f.title} className="feature-card">
                  <div className="feature-card-icon">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-white">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-t border-white/[0.06] px-4 py-24">
          <div className="mx-auto max-w-6xl">
            <p className="section-label">Pricing</p>
            <h2 className="section-heading">Simple plans that scale with you</h2>
            <p className="section-subheading">
              Start free, upgrade when you need more AI generations and connected accounts.
            </p>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {[
                {
                  name: 'Free',
                  price: '$0',
                  period: 'forever',
                  features: ['2 connected accounts', '10 AI generations / day', 'Basic analytics'],
                },
                {
                  name: 'Pro',
                  price: '$29',
                  period: '/month',
                  popular: true,
                  features: ['10 accounts', '100 AI generations / day', 'Scheduling + insights'],
                },
                {
                  name: 'Team',
                  price: '$99',
                  period: '/month',
                  features: ['50 accounts', '500 AI generations / day', 'Priority support'],
                },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={`feature-card flex flex-col ${plan.popular ? 'border-violet-500/40 ring-1 ring-violet-500/30' : ''}`}
                >
                  {plan.popular && <span className="badge-violet mb-3 w-fit">Most popular</span>}
                  <h3 className="font-display text-xl font-bold text-white">{plan.name}</h3>
                  <p className="mt-2">
                    <span className="font-display text-3xl font-bold text-violet-300">{plan.price}</span>
                    <span className="text-sm text-slate-500">{plan.period}</span>
                  </p>
                  <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-400">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <span className="text-violet-400">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/register" className={`mt-6 w-full text-center ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}>
                    Get started
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-t border-white/[0.06] px-4 py-24">
          <div className="mx-auto max-w-6xl">
            <p className="section-label">How it works</p>
            <h2 className="section-heading">Three steps to smarter social</h2>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {steps.map((step) => (
                <div key={step.num} className="relative">
                  <span className="font-display text-5xl font-bold text-white/10">{step.num}</span>
                  <h3 className="mt-2 font-display text-xl font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-white/[0.06] px-4 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="glass-card relative overflow-hidden !p-10 md:!p-14">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />
              <h2 className="relative font-display text-3xl font-bold text-white md:text-4xl">
                Ready to transform your social workflow?
              </h2>
              <p className="relative mt-4 text-slate-400">
                Register, pick a plan, and start creating in minutes.
              </p>
              <Link to="/register" className="btn-primary relative mt-8 inline-block">
                Create your account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
