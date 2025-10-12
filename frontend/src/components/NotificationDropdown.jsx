import { Fragment, useState, useEffect } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { BellIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsAPI } from '../api/client';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function NotificationDropdown() {
  const queryClient = useQueryClient();
  const [showAll, setShowAll] = useState(false);

  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.list({ limit: 10 }).then(res => res.data),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unread_count || 0;

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id) => notificationsAPI.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsAPI.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => notificationsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    },
  });

  const handleMarkAsRead = (id, e) => {
    e.stopPropagation();
    markAsReadMutation.mutate(id);
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    deleteNotificationMutation.mutate(id);
  };

  const getNotificationIcon = (type) => {
    // Return appropriate icon based on notification type
    return null; // Will use default bell icon for now
  };

  const displayedNotifications = showAll ? notifications : notifications.slice(0, 5);

  return (
    <Menu as="div" className="relative">
      <Menu.Button className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-full transition-colors relative">
        <span className="sr-only">View notifications</span>
        <BellIcon className="h-6 w-6" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-10 mt-2 w-96 origin-top-right rounded-md bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none max-h-[600px] overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsReadMutation.mutate()}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-slate-400">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <BellIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-slate-500" />
              <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                No notifications yet
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {displayedNotifications.map((notification) => (
                <Menu.Item key={notification.id}>
                  {({ active }) => (
                    <div
                      className={classNames(
                        active ? 'bg-gray-50 dark:bg-slate-700/50' : '',
                        !notification.read ? 'bg-blue-50/30 dark:bg-blue-900/10' : '',
                        'px-4 py-3 relative group'
                      )}
                    >
                      {notification.link ? (
                        <Link
                          to={notification.link}
                          className="block"
                          onClick={() => !notification.read && markAsReadMutation.mutate(notification.id)}
                        >
                          <NotificationContent notification={notification} />
                        </Link>
                      ) : (
                        <div onClick={() => !notification.read && markAsReadMutation.mutate(notification.id)}>
                          <NotificationContent notification={notification} />
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="absolute top-3 right-3 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.read && (
                          <button
                            onClick={(e) => handleMarkAsRead(notification.id, e)}
                            className="p-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                            title="Mark as read"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(notification.id, e)}
                          className="p-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </Menu.Item>
              ))}
            </div>
          )}

          {notifications.length > 5 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 text-center">
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
              >
                {showAll ? 'Show less' : `View all (${notifications.length})`}
              </button>
            </div>
          )}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

function NotificationContent({ notification }) {
  return (
    <>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className={classNames(
            !notification.read ? 'bg-indigo-600' : 'bg-gray-400 dark:bg-slate-600',
            'h-2 w-2 rounded-full mt-2'
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
            {notification.title}
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
            {notification.message}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    </>
  );
}
