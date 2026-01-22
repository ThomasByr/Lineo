import { useNotification } from "../../contexts/NotificationContext";
import { NotificationCard } from "./NotificationCard";
import { useEffect, useRef } from "preact/hooks";
import { useClickOutside } from "../../hooks/useClickOutside";

export function NotificationPanel() {
  const { notifications, isPanelOpen, closePanel, clearAllNotifications, markAsRead } = useNotification();
  const panelRef = useRef<HTMLDivElement>(null);

  useClickOutside(
    panelRef,
    (event) => {
      // Don't close if clicking the bell button (it handles toggling)
      if (!(event.target as Element).closest(".notification-bell-btn")) {
        closePanel();
      }
    },
    isPanelOpen,
  );

  useEffect(() => {
    if (isPanelOpen) {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length > 0) {
        unreadIds.forEach((id) => markAsRead(id));
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
          notifications.map((notification) => (
            <NotificationCard key={notification.id} notification={notification} />
          ))
        )}
      </div>
    </div>
  );
}
