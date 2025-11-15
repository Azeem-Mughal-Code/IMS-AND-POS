import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { BellIcon, HistoryIcon, TrashIcon } from '../Icons';
import { Notification } from '../../types';

const timeSince = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
}

const NotificationItem: React.FC<{ notification: Notification }> = ({ notification }) => {
    const { markNotificationAsRead } = useAppContext();
    return (
        <div 
            className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${notification.isRead ? '' : 'bg-blue-50 dark:bg-gray-700'}`}
            onClick={() => markNotificationAsRead(notification.id)}
            role="button"
        >
            <div className="flex-shrink-0 mt-1">
                <div className={`w-3 h-3 rounded-full ${notification.isRead ? 'bg-gray-300 dark:bg-gray-500' : 'bg-blue-500'}`}></div>
            </div>
            <div className="flex-grow">
                <p className="text-sm text-gray-800 dark:text-gray-100">{notification.message}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <HistoryIcon className="h-3 w-3" />
                    {timeSince(new Date(notification.timestamp))}
                </p>
            </div>
        </div>
    );
};

export const NotificationsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { notifications, markAllNotificationsAsRead, clearNotifications } = useAppContext();

    const groupedNotifications = useMemo(() => {
        const groups: { [key: string]: Notification[] } = {};
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const isSameDay = (d1: Date, d2: Date) => 
            d1.getFullYear() === d2.getFullYear() && 
            d1.getMonth() === d2.getMonth() && 
            d1.getDate() === d2.getDate();

        notifications.forEach(n => {
            const nDate = new Date(n.timestamp);
            let key: string;
            if (isSameDay(nDate, today)) {
                key = 'Today';
            } else if (isSameDay(nDate, yesterday)) {
                key = 'Yesterday';
            } else {
                key = nDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
            }

            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(n);
        });
        return groups;
    }, [notifications]);

    const notificationDates = Object.keys(groupedNotifications);

    return (
        <div className="flex flex-col h-[60vh]">
            <div className="flex justify-between items-center px-4 pt-2 pb-4 border-b dark:border-gray-600">
                <h3 className="font-semibold text-gray-800 dark:text-white">Notifications</h3>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={markAllNotificationsAsRead}
                        disabled={notifications.length === 0}
                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:text-gray-400 disabled:no-underline"
                    >
                        Mark all as read
                    </button>
                    <button 
                        onClick={clearNotifications}
                        disabled={notifications.length === 0}
                        className="text-sm font-medium text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1 disabled:text-gray-400 disabled:cursor-not-allowed"
                        title="Clear all notifications"
                    >
                        <TrashIcon />
                        <span>Clear All</span>
                    </button>
                </div>
            </div>
            
            <div className="flex-grow overflow-y-auto p-2 space-y-4">
                {/* FIX: Replaced `Object.entries` with `Object.keys` to avoid type inference issues on the notifications array. */}
                {notificationDates.length > 0 ? (
                    notificationDates.map((date) => (
                        <div key={date}>
                            <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 px-3 py-1">{date}</h4>
                            <div className="space-y-1">
                                {groupedNotifications[date].map(n => <NotificationItem key={n.id} notification={n} />)}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                        <BellIcon className="h-12 w-12 mb-2" />
                        <h4 className="font-semibold">All caught up!</h4>
                        <p className="text-sm">You have no new notifications.</p>
                    </div>
                )}
            </div>

             <div className="flex justify-end p-4 border-t dark:border-gray-600">
                <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Close</button>
            </div>
        </div>
    );
};