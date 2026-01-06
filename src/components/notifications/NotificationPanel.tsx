import { useNotification } from '../../contexts/NotificationContext';
import { NotificationCard } from './NotificationCard';
import { useEffect, useRef } from 'preact/hooks';

export function NotificationPanel() {
  const { notifications, isPanelOpen, closePanel, clearAllNotifications, markAsRead } = useNotification();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node) && 
          !(event.target as Element).closest('.notification-bell-btn')) {
        closePanel();
      }
    };

    if (isPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPanelOpen, closePanel]);

  useEffect(() => {
      if (isPanelOpen) {
          const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
          if (unreadIds.length > 0) {
              unreadIds.forEach(id => markAsRead(id));
          }
      }
  }, [isPanelOpen, notifications, markAsRead]);


  if (!isPanelOpen) return null;

  return (
    <div className="notification-panel" ref={panelRef}>
      <div className="notification-header">
        <h3>Notifications</h3>
        {notifications.length > 0 && (
          <button className="clear-all-btn" onClick={clearAllNotifications}>
            Clear All
          </button>
        )}
      </div>
      <div className="notification-list">
        {notifications.length === 0 ? (
          <p className="no-notifications">No notifications</p>
        ) : (
          notifications.map(notification => (
            <NotificationCard key={notification.id} notification={notification} />
          ))
        )}
      </div>
    </div>
  );
}
