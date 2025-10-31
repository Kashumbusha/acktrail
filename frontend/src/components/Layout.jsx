import { Fragment } from 'react';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import ThemeToggle from './ThemeToggle';
import NotificationDropdown from './NotificationDropdown';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', adminOnly: true },
  { name: 'Reports', href: '/reports', adminOnly: true },
  { name: 'Activity', href: '/activity', adminOnly: true },
  { name: 'Policies', href: '/policies', adminOnly: true },
  { name: 'Teams', href: '/teams', adminOnly: true },
  { name: 'Users', href: '/admin/users', adminOnly: true },
  { name: 'Billing', href: '/billing', adminOnly: true },
  { name: 'Platform', href: '/platform', platformOnly: true },
  { name: 'My Assignments', href: '/my-assignments', employeeOnly: true },
];

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-slate-900">
      <Disclosure as="nav" className="sticky top-0 z-40 backdrop-blur bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/70 dark:border-slate-800">
        {({ open }) => (
          <>
            <div className="container-page">
              <div className="flex h-16 justify-between">
                <div className="flex">
                  <div className="flex flex-shrink-0 items-center">
                    <Link to="/dashboard" className="text-xl font-bold text-gray-900 dark:text-white flex items-center hover:opacity-80 transition-opacity">
                      <img src="/logo.svg" alt="AckTrail" className="h-9 w-9 mr-2" />
                      <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">AckTrail</span>
                    </Link>
                  </div>
                  <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                    {navigation.filter(n =>
                      (!n.adminOnly || user?.role === 'admin') &&
                      (!n.platformOnly || user?.is_platform_admin) &&
                      (!n.employeeOnly || user?.role !== 'admin')
                    ).map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={classNames(
                          location.pathname === item.href
                            ? 'border-primary-500 text-primary-600 dark:text-primary-300'
                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100',
                          'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium transition-colors duration-200'
                        )}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-2">
                  <ThemeToggle />
                  {/* Notification Bell */}
                  <NotificationDropdown />
                  <Menu as="div" className="relative ml-3">
                    <div>
                      <Menu.Button className="flex items-center space-x-2 rounded-full bg-white dark:bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                        <span className="sr-only">Open user menu</span>
                        <UserCircleIcon className="h-8 w-8 text-gray-400 dark:text-gray-300" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {user?.email}
                        </span>
                      </Menu.Button>
                    </div>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-200"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white dark:bg-slate-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to="/settings"
                              className={classNames(
                                active ? 'bg-gray-100 dark:bg-gray-700' : '',
                                'block px-4 py-2 text-sm text-gray-700 dark:text-gray-200'
                              )}
                            >
                              Settings
                            </Link>
                          )}
                        </Menu.Item>
                        {user?.is_platform_admin && (
                          <Menu.Item>
                            {({ active }) => (
                              <Link
                                to="/platform"
                                className={classNames(
                                  active ? 'bg-gray-100 dark:bg-gray-700' : '',
                                  'block px-4 py-2 text-sm text-gray-700 dark:text-gray-200'
                                )}
                              >
                                Platform view
                              </Link>
                            )}
                          </Menu.Item>
                        )}
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={handleLogout}
                              className={classNames(
                                active ? 'bg-gray-100 dark:bg-gray-700' : '',
                                'block w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200'
                              )}
                            >
                              Sign out
                            </button>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                </div>
                <div className="-mr-2 flex items-center sm:hidden">
                  <Disclosure.Button className="inline-flex items-center justify-center rounded-md bg-white dark:bg-slate-800 p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset">
                    <span className="sr-only">Open main menu</span>
                    {open ? (
                      <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                    ) : (
                      <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                    )}
                  </Disclosure.Button>
                </div>
              </div>
            </div>

            <Disclosure.Panel className="sm:hidden">
              <div className="space-y-1 pb-3 pt-2">
                {navigation.filter(n =>
                  (!n.adminOnly || user?.role === 'admin') &&
                  (!n.platformOnly || user?.is_platform_admin) &&
                  (!n.employeeOnly || user?.role !== 'admin')
                ).map((item) => (
                  <Disclosure.Button
                    key={item.name}
                    as={Link}
                    to={item.href}
                    className={classNames(
                      location.pathname === item.href
                        ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-blue-900 dark:bg-opacity-30 dark:text-primary-300'
                        : 'border-transparent text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100',
                      'block border-l-4 py-2 pl-3 pr-4 text-base font-medium transition-colors duration-200'
                    )}
                  >
                    {item.name}
                  </Disclosure.Button>
                ))}
              </div>
              <div className="border-t border-gray-200 dark:border-slate-700 pb-3 pt-4">
                <div className="flex items-center px-4">
                  <div className="flex-shrink-0">
                    <UserCircleIcon className="h-10 w-10 text-gray-400" />
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800 dark:text-slate-200">{user?.email}</div>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <Disclosure.Button
                    as={Link}
                    to="/settings"
                    className="block w-full px-4 py-2 text-left text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                  >
                    Settings
                  </Disclosure.Button>
                  <Disclosure.Button
                    as="button"
                    onClick={handleLogout}
                    className="block w-full px-4 py-2 text-left text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                  >
                    Sign out
                  </Disclosure.Button>
                </div>
              </div>
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>

      <main className="container-page py-8">
        {children}
      </main>
    </div>
  );
}
