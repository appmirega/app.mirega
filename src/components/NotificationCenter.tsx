
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Bell, X, Check, AlertTriangle, Info, CheckCircle } from 'lucide-react';

interface Notification {
  id: string;
  user_id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationCenterProps {
  onNavigate?: (path: string) => void;
}

export function NotificationCenter({ onNavigate }: NotificationCenterProps) {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile?.id) return;

    loadNotifications();

    const channel = supabase
      .channel('notifications-center')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          if (newNotification.user_id === profile.id) {
            setNotifications((prev) => [newNotification, ...prev]);
            if (!newNotification.is_read) {
              setUnreadCount((prev) => prev + 1);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const loadNotifications = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setNotifications((data || []) as Notification[]);
      setUnreadCount(data?.filter((n) => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!profile?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', profile.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.link && onNavigate) {
      onNavigate(notification.link);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        className="relative p-2 rounded-lg hover:bg-gray-100 transition"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <Bell className="w-6 h-6 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-40">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-gray-700" />
                <h2 className="font-semibold text-gray-900">
                  Notificaciones
                </h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  No tienes notificaciones.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-500">
                    <span>{unreadCount} sin leer</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-blue-600 hover:underline"
                      >
                        Marcar todas como leídas
                      </button>
                    )}
                  </div>

                  {notifications.map((notification) => {
                    const icon =
                      notification.type === 'error' ? (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      ) : notification.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : notification.type === 'warning' ? (
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      ) : (
                        <Info className="w-5 h-5 text-blue-500" />
                      );

                    return (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-gray-50 ${
                          !notification.is_read ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="mt-0.5">{icon}</div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-700">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(
                              notification.created_at
                            ).toLocaleString('es-CL')}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 mt-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
