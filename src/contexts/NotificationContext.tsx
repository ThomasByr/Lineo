import { createContext, ComponentChildren } from 'preact';
import { useContext, useState, useCallback } from 'preact/hooks';
import { AppNotification, NotificationType } from '../types';

interface NotificationContextType {
  notifications: AppNotification[];
  toasts: AppNotification[];
  addNotification: (type: NotificationType, message: string) => void;
  removeNotification: (id: string) => void;
  dismissToast: (id: string, saveToHistory?: boolean) => void;
  clearAllNotifications: () => void;
  markAsRead: (id: string) => void;
  unreadCount: number;
  isPanelOpen: boolean;
  togglePanel: () => void;
  closePanel: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ComponentChildren }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const addNotification = useCallback((type: NotificationType, message: string) => {
    const newNotification: AppNotification = {
      id: crypto.randomUUID(),
      type,
      message,
      timestamp: Date.now(),
      read: false,
    };
    // Add to toasts instead of notifications directly
    setToasts(prev => [newNotification, ...prev]);
  }, []);

  const dismissToast = useCallback((id: string, saveToHistory: boolean = true) => {
    setToasts(prev => {
      const toast = prev.find(t => t.id === id);
      if (toast && saveToHistory) {
        // Move to notifications history when dismissed from toast view
        setNotifications(history => [toast, ...history]);
      }
      return prev.filter(t => t.id !== id);
    });
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const togglePanel = useCallback(() => setIsPanelOpen(prev => !prev), []);
  const closePanel = useCallback(() => setIsPanelOpen(false), []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      toasts,
      addNotification,
      removeNotification,
      dismissToast,
      clearAllNotifications,
      markAsRead,
      unreadCount,
      isPanelOpen,
      togglePanel,
      closePanel
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
