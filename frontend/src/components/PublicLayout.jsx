import { Link } from 'react-router-dom';
import { Disclosure } from '@headlessui/react';
import {
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import ThemeToggle from './ThemeToggle';
import React from 'react';
import { Outlet } from 'react-router-dom'; // Import Outlet

export default function PublicLayout({ children }) {
  return (
    <div className="bg-white dark:bg-slate-900 min-h-screen">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 backdrop-blur bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/70 dark:border-slate-800">
        <div className="container-page">
          <Disclosure>
            {({ open }) => (
              <>
                <div className="flex justify-between h-16">
                  <div className="flex items-center min-w-0">
                    <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
                      <img src="/logo.svg" alt="AckTrail" className="h-9 w-9" />
                      <span className="ml-3 text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent whitespace-nowrap">
                        AckTrail
                      </span>
                    </Link>
                  </div>
                  <div className="hidden sm:flex items-center space-x-3">
                    <ThemeToggle />
                    <Link to="/pricing" className="btn btn-secondary">Pricing</Link>
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
                    <Link to="/pricing" className="btn btn-secondary w-full">Pricing</Link>
                    <Link to="/login" className="btn btn-secondary w-full">Sign In</Link>
                    <Link to="/signup" className="btn btn-primary w-full">Sign up</Link>
                  </div>
                </Disclosure.Panel>
              </>
            )}
          </Disclosure>
        </div>
      </nav>

      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 mt-auto">
        <div className="container-page py-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img src="/logo.svg" alt="AckTrail" className="h-7 w-7" />
              <span className="ml-3 text-base font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                AckTrail
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/legal" className="text-slate-300 hover:text-white text-xs underline underline-offset-2">
                Legal
              </Link>
              <p className="text-slate-400 text-xs">© 2025 AckTrail. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
