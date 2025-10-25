import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

      {/* Feature Cards Section */}
      <section className="py-16 bg-gray-50 dark:bg-slate-800">
        <div className="container-page">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white dark:bg-slate-700 rounded-lg shadow-lg p-6 text-center transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
              <SparklesIcon className="mx-auto h-12 w-12 text-indigo-500" />
              <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Automated Reminders</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">Set it and forget it. Our system handles follow-ups.</p>
            </div>
            <div className="bg-white dark:bg-slate-700 rounded-lg shadow-lg p-6 text-center transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
              <ArrowPathIcon className="mx-auto h-12 w-12 text-green-500" />
              <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Version Control & Distribution</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">Manage policy versions and distribute updates seamlessly.</p>
            </div>
            <div className="bg-white dark:bg-slate-700 rounded-lg shadow-lg p-6 text-center transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
              <ShieldCheckIcon className="mx-auto h-12 w-12 text-purple-500" />
              <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Ironclad Audit Trails</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">Comprehensive logs of every action for full compliance.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white dark:bg-slate-900">
        <div className="container-page">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100">Everything you need</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300">Purpose-built to give regulated teams audit-ready proof without heavyweight software</p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="card hover:shadow-md transition-shadow">
              <div className="card-body">
                <div className="h-12 w-12 rounded-lg bg-indigo-600 text-white grid place-items-center">
                  <DocumentTextIcon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Centralised policy library</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300">Upload PDF or Markdown policies, lock versions, and keep previous revisions for easy rollbacks.</p>
              </div>
            </div>

            <div className="card hover:shadow-md transition-shadow">
              <div className="card-body">
                <div className="h-12 w-12 rounded-lg bg-green-600 text-white grid place-items-center">
                  <ShieldCheckIcon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Audit-ready receipts</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300">PDF receipts with IP addresses, typed signatures, and SHA-256 hashes that prove nothing was tampered with.</p>
              </div>
            </div>

            <div className="card hover:shadow-md transition-shadow">
              <div className="card-body">
                <div className="h-12 w-12 rounded-lg bg-purple-600 text-white grid place-items-center">
                  <SparklesIcon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Passwordless rollout</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300">Magic links and verification codes mean zero IT setup—invite employees, contractors, and guests instantly.</p>
              </div>
            </div>

            <div className="card hover:shadow-md transition-shadow">
              <div className="card-body">
                <div className="h-12 w-12 rounded-lg bg-sky-600 text-white grid place-items-center">
                  <UserGroupIcon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Mixed workforce coverage</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300">Admins, employees, seasonal staff, and guests are tracked separately so you stay within paid seats.</p>
              </div>
            </div>

            <div className="card hover:shadow-md transition-shadow">
              <div className="card-body">
                <div className="h-12 w-12 rounded-lg bg-yellow-500 text-white grid place-items-center">
                  <BellIcon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Smart reminder engine</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300">Automated nudges escalate urgency, log every touch, and stop after three attempts to avoid noise.</p>
              </div>
            </div>

            <div className="card hover:shadow-md transition-shadow">
              <div className="card-body">
                <div className="h-12 w-12 rounded-lg bg-emerald-600 text-white grid place-items-center">
                  <ChartBarIcon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Compliance analytics</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300">Track acknowledgement rates, overdue policies, and export auditor-ready CSVs in one click.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-950">
        <div className="container-page">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100">Built for compliance-critical moments</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300">Acktrail replaces ad-hoc email trails with verifiable proof when the stakes are high.</p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="card h-full">
              <div className="card-body space-y-3">
                <div className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                  External audits
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Produce evidence packs in minutes</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">Hand auditors CSV exports, individual receipts, and hash proofs instead of stitching screenshots together.</p>
              </div>
            </div>
            <div className="card h-full">
              <div className="card-body space-y-3">
                <div className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
                  HR & people ops
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Onboard every hire with zero IT lift</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">Magic links and guest seats ensure policies reach employees, contractors, and vendors on day one.</p>
              </div>
            </div>
            <div className="card h-full">
              <div className="card-body space-y-3">
                <div className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  Safety & operations
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Keep field teams current and accountable</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">Automated reminders and IP-stamped acknowledgments help safety-critical updates reach every teammate.</p>
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
