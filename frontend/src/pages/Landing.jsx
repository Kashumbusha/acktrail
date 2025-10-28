import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ShieldCheckIcon,
  BellIcon,
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon,
  SparklesIcon,
  ArrowPathIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import DemoRequestModal from '../components/DemoRequestModal';

export default function Landing() {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    { src: '/emailhell.svg', alt: 'Email Hell vs AckTrail Solution' },
    { src: '/paperhell.svg', alt: 'Paper Hell vs AckTrail Solution' }
  ];

  // Auto-play carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 15000); // Change slide every 15 seconds

    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <>
      <Helmet>
        <link rel="canonical" href="https://acktrail.com/" />
        <meta property="og:url" content="https://acktrail.com/" />
      </Helmet>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900" />
        <div className="container-page">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            <div className="relative sm:text-center lg:text-left lg:col-span-7">
              <a
                href="#features"
                className="inline-flex items-center text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/20 rounded-full p-1 pr-2 text-sm font-medium transition duration-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/30"
              >
                <span className="px-3 py-0.5 text-white text-xs bg-indigo-600 rounded-full">New</span>
                <span className="ml-4 text-indigo-700 dark:text-indigo-300">Auto-reminders save 2+ hours/week</span>
                <svg
                  className="ml-2 h-4 w-4 text-indigo-500 dark:text-indigo-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl md:text-6xl">
                <span className="block xl:inline">Stop Chasing</span>{' '}
                <span className="block text-indigo-600 dark:text-indigo-400 xl:inline">Policy Signatures</span>
              </h1>
              <p className="mt-3 text-base text-gray-500 dark:text-gray-300 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                Send policies. Track acknowledgments. Get proof. All without the email chaos.
              </p>
              <p className="mt-2 text-base text-gray-500 dark:text-gray-300 sm:text-lg sm:max-w-xl sm:mx-auto md:text-lg lg:mx-0">
                No more emailing PDFs and hoping people read them. No more manual follow-ups. No more hunting for signatures during audits. Just send, track, and prove—in seconds.
              </p>
              <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                <div className="rounded-md shadow">
                  <Link
                    to="/signup"
                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
                  >
                    Start Free Trial
                  </Link>
                </div>
                <div className="mt-3 sm:mt-0 sm:ml-3">
                  <button
                    type="button"
                    onClick={() => setShowDemoModal(true)}
                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 md:py-4 md:text-lg md:px-10"
                  >
                    Book a demo
                  </button>
                </div>
              </div>
              <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                Prefer to browse first? <a href="#features" className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">Jump to features</a>
              </div>
            </div>
            <div className="mt-12 relative lg:mt-0 lg:col-span-5">
              <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:p-0 lg:h-full">
                {/* Carousel Container */}
                <div className="relative rounded-xl shadow-2xl overflow-hidden bg-slate-900 dark:bg-slate-950">
                  {/* Slides */}
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {slides.map((slide, index) => (
                      <div
                        key={index}
                        className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                          index === currentSlide
                            ? 'opacity-100 translate-x-0'
                            : index < currentSlide
                            ? 'opacity-0 -translate-x-full'
                            : 'opacity-0 translate-x-full'
                        }`}
                      >
                        <img
                          src={slide.src}
                          alt={slide.alt}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Slide Indicators */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                    {slides.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${
                          index === currentSlide
                            ? 'bg-indigo-500 w-8'
                            : 'bg-slate-400 hover:bg-slate-300'
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>

                  {/* Navigation Arrows */}
                  <button
                    onClick={() => setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-slate-800/50 hover:bg-slate-700/70 text-white p-2 rounded-full transition-all"
                    aria-label="Previous slide"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-800/50 hover:bg-slate-700/70 text-white p-2 rounded-full transition-all"
                    aria-label="Next slide"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white dark:bg-slate-900">
        <div className="container-page">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100">Simple Tools That Replace Email Chaos</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300">Built for HR teams drowning in manual follow-ups</p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card hover:shadow-md transition-shadow">
              <div className="card-body">
                <div className="h-14 w-14 rounded-xl bg-indigo-600 text-white grid place-items-center mb-4">
                  <UserGroupIcon className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Bulk Send & Track</h3>
                <ul className="mt-3 space-y-2 text-slate-600 dark:text-slate-300">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Upload policy once, send to entire team</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Dashboard shows who&apos;s done, who&apos;s pending</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="card hover:shadow-md transition-shadow">
              <div className="card-body">
                <div className="h-14 w-14 rounded-xl bg-yellow-500 text-white grid place-items-center mb-4">
                  <BellIcon className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Smart Reminders</h3>
                <ul className="mt-3 space-y-2 text-slate-600 dark:text-slate-300">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Automatic nudges (Day 3, 7, 14)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Stops after 3 attempts (no spam)</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="card hover:shadow-md transition-shadow">
              <div className="card-body">
                <div className="h-14 w-14 rounded-xl bg-purple-600 text-white grid place-items-center mb-4">
                  <SparklesIcon className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Zero IT Setup</h3>
                <ul className="mt-3 space-y-2 text-slate-600 dark:text-slate-300">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Magic links = no passwords needed</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Works for employees, contractors, anyone</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="card hover:shadow-md transition-shadow">
              <div className="card-body">
                <div className="h-14 w-14 rounded-xl bg-emerald-600 text-white grid place-items-center mb-4">
                  <DocumentTextIcon className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Download Proof Anytime</h3>
                <ul className="mt-3 space-y-2 text-slate-600 dark:text-slate-300">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>One-click CSV export for audits</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Individual PDF receipts with timestamps</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Before & After Section */}
      <section className="py-16 bg-slate-50 dark:bg-slate-950">
        <div className="container-page">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100">The Old Way vs The AckTrail Way</h2>
            <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">Stop the manual chaos. Start tracking automatically.</p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-8 shadow-2xl overflow-x-auto">
              <img
                src="/before-after-comparison.svg"
                alt="Comparison between manual policy tracking (chaotic desk, stressed person, spreadsheets) vs AckTrail automated system (clean dashboard, organized tracking, happy user)"
                className="w-full h-auto min-w-[800px]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="container-page">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100">Who Uses AckTrail Every Day?</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300">Real teams solving real operational headaches</p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-2">
            <div className="card h-full">
              <div className="card-body space-y-4">
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center justify-center rounded-full bg-indigo-600 w-12 h-12 text-white font-bold text-xl">
                    🎯
                  </div>
                  <div>
                    <div className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                      BIGGEST USE CASE
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">HR Onboarding</h3>
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
                  New hire starts Monday. Send 10 policies in one click. Track completion. No email chaos.
                </p>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                    &ldquo;Before: Email 10 PDFs, hope they read them, chase signatures.<br/>
                    Now: One click. Done.&rdquo;
                  </p>
                </div>
              </div>
            </div>

            <div className="card h-full">
              <div className="card-body space-y-4">
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center justify-center rounded-full bg-purple-600 w-12 h-12 text-white font-bold text-xl">
                    📚
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Annual Training</h3>
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
                  Security awareness for 50 people. Auto-remind stragglers. Export proof when compliance asks.
                </p>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                    &ldquo;Before: Send email, track in spreadsheet.<br/>
                    Now: Send once, auto-remind, export CSV.&rdquo;
                  </p>
                </div>
              </div>
            </div>

            <div className="card h-full">
              <div className="card-body space-y-4">
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center justify-center rounded-full bg-emerald-600 w-12 h-12 text-white font-bold text-xl">
                    🔄
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Policy Updates</h3>
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
                  Update handbook. Everyone re-acknowledges. See 85% complete in dashboard, not spreadsheet.
                </p>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                    &ldquo;Before: Email blast, manual tracking nightmare.<br/>
                    Now: Bulk send, track completion, done.&rdquo;
                  </p>
                </div>
              </div>
            </div>

            <div className="card h-full">
              <div className="card-body space-y-4">
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center justify-center rounded-full bg-amber-600 w-12 h-12 text-white font-bold text-xl">
                    🤝
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Contractors & Vendors</h3>
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
                  NDA for one-time contractor. Magic link → they sign → you get receipt. No printing, scanning, filing.
                </p>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                    &ldquo;Before: Email, print, scan, file.<br/>
                    Now: Magic link, instant receipt.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Roadmap Section */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="container-page grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Security and trust from day one</h2>
            <p className="text-slate-600 dark:text-slate-300">
              Operated by Acktrail FZE (Sharjah Publishing City Free Zone, UAE) with encryption in transit, role-based access,
              and off-site backups. Every acknowledgement is locked with a SHA-256 hash so tampering is detectable.
            </p>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <ShieldCheckIcon className="h-5 w-5 text-emerald-500 mt-0.5" />
                <span>Receipts capture IP address, signature method, and policy version for full traceability.</span>
              </li>
              <li className="flex items-start gap-2">
                <ClockIcon className="h-5 w-5 text-indigo-500 mt-0.5" />
                <span>Immutable activity trail and CSV exports make internal audits painless.</span>
              </li>
              <li className="flex items-start gap-2">
                <DocumentTextIcon className="h-5 w-5 text-purple-500 mt-0.5" />
                <span>Legal centre published at <Link to="/legal" className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">acktrail.com/legal</Link> with company, privacy, and contact details.</span>
              </li>
            </ul>
          </div>
          <div className="card bg-slate-50 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
            <div className="card-body space-y-4">
              <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
                Coming soon
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Slack notifications + HRIS sync</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Keep teams accountable where they work. We&apos;re preparing Slack alerts for new assignments and reminders, with HRIS roster sync on the roadmap. Let us know in the demo form if you want early access.
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <ArrowPathIcon className="h-5 w-5 text-slate-400" />
                <span>Integrations rollout begins Q2 &mdash; register interest to help shape it.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden dark:from-slate-800 dark:to-slate-900 py-16 sm:py-20">
        <div className="container-page text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-gray-100">
            <span className="block">Ready to get started?</span>
            <span className="block text-slate-800 dark:text-gray-100">Start managing policies today.</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-gray-400">
            Start your 7-day trial today: launch in minutes, export audit evidence on day one, and add Slack alerts when they ship.
          </p>
          <Link to="/signup" className="btn bg-white text-primary-600 hover:bg-primary-50 mt-8 shadow-lg hover:shadow-xl">
            Sign up
          </Link>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowDemoModal(true)}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Or book a live walkthrough
            </button>
          </div>
        </div>
      </section>

      <DemoRequestModal open={showDemoModal} onClose={() => setShowDemoModal(false)} />
    </>
  );
}
