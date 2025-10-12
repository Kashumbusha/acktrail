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

export default function Landing() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900" />
        <div className="container-page">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            <div className="relative sm:text-center lg:text-left lg:col-span-7">
              <a
                href="#"
                className="inline-flex items-center text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/20 rounded-full p-1 pr-2 text-sm font-medium transition duration-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/30"
              >
                <span className="px-3 py-0.5 text-white text-xs bg-indigo-600 rounded-full">New</span>
                <span className="ml-4 text-indigo-700 dark:text-indigo-300">Version 3.0 Released!</span>
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
                <span className="block xl:inline">Ensure 100% Compliance,</span>{' '}
                <span className="block text-indigo-600 dark:text-indigo-400 xl:inline">Effortlessly.</span>
              </h1>
              <p className="mt-3 text-base text-gray-500 dark:text-gray-300 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                Streamline policy distribution, track acknowledgments in real-time, and automate reminders to ensure your team is always compliant. Focus on your business, we'll handle the policies.
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
                  <a
                    href="#features"
                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 md:py-4 md:text-lg md:px-10"
                  >
                    Learn More
                  </a>
                </div>
              </div>
            </div>
            <div className="mt-12 relative lg:mt-0 lg:col-span-5">
              <div className="mx-auto max-w-md px-4 sm:max-w-3xl sm:px-6 lg:p-0 lg:h-full">
                <div className="aspect-w-10 aspect-h-6 rounded-xl shadow-xl overflow-hidden sm:aspect-w-16 sm:aspect-h-7 lg:aspect-none lg:h-full">
                  <svg width="600" height="400" viewBox="0 0 600 400" fill="none" xmlns="http://www.w3.org/2000/svg" class="rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800">
                    <rect x="0" y="0" width="600" height="400" rx="12" fill="currentColor" class="text-white dark:text-slate-800"/>
                    <rect x="20" y="20" width="560" height="30" rx="4" fill="currentColor" class="text-gray-200 dark:text-gray-700"/>
                    <circle cx="35" cy="35" r="8" fill="#F87171"/>
                    <circle cx="55" cy="35" r="8" fill="#FBBF24"/>
                    <circle cx="75" cy="35" r="8" fill="#34D399"/>
                    
                    <rect x="20" y="60" width="300" height="150" rx="8" fill="currentColor" class="text-indigo-50 dark:text-indigo-900/30"/>
                    <rect x="340" y="60" width="240" height="150" rx="8" fill="currentColor" class="text-blue-50 dark:text-blue-900/30"/>

                    <path d="M40 180 L80 140 L120 160 L160 120 L200 150 L240 130 L280 170" stroke="#818CF8" stroke-width="4" fill="none" class="text-indigo-400"/>
                    <circle cx="40" cy="180" r="5" fill="#818CF8"/>
                    <circle cx="80" cy="140" r="5" fill="#818CF8"/>
                    <circle cx="120" cy="160" r="5" fill="#818CF8"/>
                    <circle cx="160" cy="120" r="5" fill="#818CF8"/>
                    <circle cx="200" cy="150" r="5" fill="#818CF8"/>
                    <circle cx="240" cy="130" r="5" fill="#818CF8"/>
                    <circle cx="280" cy="170" r="5" fill="#818CF8"/>

                    <rect x="360" y="80" width="30" height="40" rx="4" fill="#60A5FA"/>
                    <path d="M375 85 L375 115 M365 95 L385 95" stroke="white" stroke-width="2"/>
                    <rect x="410" y="80" width="30" height="40" rx="4" fill="#60A5FA"/>
                    <path d="M425 85 L425 115 M415 95 L435 95" stroke="white" stroke-width="2"/>
                    <rect x="460" y="80" width="30" height="40" rx="4" fill="#60A5FA"/>
                    <path d="M475 85 L475 115 M465 95 L485 95" stroke="white" stroke-width="2"/>

                    <rect x="20" y="225" width="560" height="150" rx="8" fill="currentColor" class="text-gray-50 dark:text-gray-700/50"/>
                    <rect x="40" y="245" width="100" height="15" rx="4" fill="currentColor" class="text-gray-200 dark:text-gray-600"/>
                    <rect x="40" y="270" width="200" height="10" rx="2" fill="currentColor" class="text-gray-200 dark:text-gray-600"/>
                    <rect x="40" y="290" width="180" height="10" rx="2" fill="currentColor" class="text-gray-200 dark:text-gray-600"/>
                    <rect x="40" y="310" width="150" height="10" rx="2" fill="currentColor" class="text-gray-200 dark:text-gray-600"/>
                  </svg>
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
            <p className="mt-3 text-slate-600 dark:text-slate-300">A comprehensive solution designed for modern organizations</p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="card hover:shadow-md transition-shadow">
              <div className="card-body">
                <div className="h-12 w-12 rounded-lg bg-indigo-600 text-white grid place-items-center">
                  <DocumentTextIcon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Policy Management</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300">Upload and manage PDF or Markdown policies with versioning.</p>
              </div>
            </div>

            <div className="card hover:shadow-md transition-shadow">
              <div className="card-body">
                <div className="h-12 w-12 rounded-lg bg-purple-600 text-white grid place-items-center">
                  <UserGroupIcon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Easy Assignment</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300">Assign via email with CSV bulk import for large deployments.</p>
              </div>
            </div>

            <div className="card hover:shadow-md transition-shadow">
              <div className="card-body">
                <div className="h-12 w-12 rounded-lg bg-yellow-500 text-white grid place-items-center">
                  <BellIcon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Smart Reminders</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300">Automated reminders with escalating urgency and tracking.</p>
              </div>
            </div>

            <div className="card hover:shadow-md transition-shadow">
              <div className="card-body">
                <div className="h-12 w-12 rounded-lg bg-emerald-600 text-white grid place-items-center">
                  <ChartBarIcon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Real-time Analytics</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300">Track rates, pending and overdue; export to CSV.</p>
              </div>
            </div>

            <div className="card hover:shadow-md transition-shadow">
              <div className="card-body">
                <div className="h-12 w-12 rounded-lg bg-sky-600 text-white grid place-items-center">
                  <ShieldCheckIcon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Secure Authentication</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300">Magic links and verification codes—no passwords required.</p>
              </div>
            </div>

            <div className="card hover:shadow-md transition-shadow">
              <div className="card-body">
                <div className="h-12 w-12 rounded-lg bg-amber-600 text-white grid place-items-center">
                  <ClockIcon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Audit Trail</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300">Complete history with PDF receipts and SHA-256 hashing.</p>
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
          <p className="mt-4 text-lg text-slate-600 dark:text-gray-400">No credit card required. Get started in minutes.</p>
          <Link to="/signup" className="btn bg-white text-primary-600 hover:bg-primary-50 mt-8 shadow-lg hover:shadow-xl">
            Sign up
          </Link>
        </div>
      </section>
    </>
  );
}
