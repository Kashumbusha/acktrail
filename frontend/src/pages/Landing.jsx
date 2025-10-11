import { Link } from 'react-router-dom';
import { Disclosure } from '@headlessui/react';
import {
  DocumentTextIcon,
  ShieldCheckIcon,
  BellIcon,
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import ThemeToggle from '../components/ThemeToggle';

export default function Landing() {
  return (
    <div className="bg-white dark:bg-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 backdrop-blur bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/70 dark:border-slate-800">
        <div className="container-page">
          <Disclosure>
            {({ open }) => (
              <>
                <div className="flex justify-between h-16">
                  <div className="flex items-center min-w-0">
                    <div className="bg-indigo-600 rounded-xl p-2 shadow">
                      <DocumentTextIcon className="h-6 w-6 text-white" />
                    </div>
                    <span className="ml-3 text-lg font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap truncate">
                      Policy Acknowledgment Tracker
                    </span>
                  </div>
                  <div className="hidden sm:flex items-center space-x-3">
                    <ThemeToggle />
                    <Link to="/login" className="btn btn-secondary">Sign In</Link>
                    <Link to="/signup" className="btn btn-primary">Sign up</Link>
                  </div>
                  <div className="-mr-2 flex items-center sm:hidden">
                    <ThemeToggle />
                    <Disclosure.Button className="ml-1 inline-flex items-center justify-center rounded-md bg-white p-2 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-inset">
                      <span className="sr-only">Open main menu</span>
                      {open ? (
                        <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                      ) : (
                        <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                      )}
                    </Disclosure.Button>
                  </div>
                </div>

                <Disclosure.Panel className="sm:hidden">
                  <div className="space-y-2 pb-3 pt-2 px-2">
                    <Link to="/login" className="btn btn-secondary w-full">Sign In</Link>
                    <Link to="/signup" className="btn btn-primary w-full">Sign up</Link>
                  </div>
                </Disclosure.Panel>
              </>
            )}
          </Disclosure>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900" />
        <div className="container-page">
          <div className="grid lg:grid-cols-2 gap-10 items-center py-16 md:py-24">
            <div>
              <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/40 dark:text-indigo-300">
                New • Modern policy tracking
              </span>
              <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Simplify Policy
                <br />
                Acknowledgment Management
              </h1>
              <p className="mt-4 text-lg text-slate-600 max-w-xl dark:text-slate-300">
                Streamline distribution, track acknowledgments in real-time, and ensure compliance with an intuitive, modern platform.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link to="/signup" className="btn btn-primary">Sign up</Link>
                <a href="#features" className="btn btn-secondary">Learn More</a>
              </div>
              <div className="mt-10 grid grid-cols-3 gap-6 text-center">
                <div className="card">
                  <div className="card-body">
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">5m+</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Emails sent securely</div>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body">
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">99.9%</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Uptime SLA</div>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body">
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">AES-256</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Encryption at rest</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-tr from-indigo-200/40 via-purple-200/40 to-transparent blur-2xl dark:from-indigo-900/20 dark:via-purple-900/20" />
              <div className="card shadow-lg">
                <div className="card-body">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-indigo-50 p-4 dark:bg-indigo-500/10">
                      <DocumentTextIcon className="h-6 w-6 text-indigo-600" />
                      <div className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">Policies</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Upload PDF/Markdown</div>
                    </div>
                    <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-500/10">
                      <UserGroupIcon className="h-6 w-6 text-purple-600" />
                      <div className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">Assignments</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Bulk CSV import</div>
                    </div>
                    <div className="rounded-lg bg-green-50 p-4 dark:bg-emerald-500/10">
                      <ChartBarIcon className="h-6 w-6 text-green-600" />
                      <div className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">Analytics</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Real-time insights</div>
                    </div>
                    <div className="rounded-lg bg-yellow-50 p-4 dark:bg-amber-500/10">
                      <BellIcon className="h-6 w-6 text-yellow-600" />
                      <div className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">Reminders</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Automated emails</div>
                    </div>
                  </div>
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
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600" />
        <div className="container-page text-center py-16 sm:py-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            <span className="block">Ready to get started?</span>
            <span className="block text-indigo-200">Start managing policies today.</span>
          </h2>
          <p className="mt-4 text-lg text-indigo-100">No credit card required. Get started in minutes.</p>
          <Link to="/signup" className="btn bg-white text-indigo-700 hover:bg-indigo-50 mt-8">Sign up</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900">
        <div className="container-page py-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <DocumentTextIcon className="h-6 w-6 text-indigo-400" />
              <span className="ml-2 text-sm font-semibold text-white">
                Policy Acknowledgment Tracker
              </span>
            </div>
            <p className="text-slate-400 text-xs">© 2025 Policy Tracker. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
