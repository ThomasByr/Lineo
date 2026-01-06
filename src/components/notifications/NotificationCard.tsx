import { AppNotification } from "../../types";
import { useNotification } from "../../contexts/NotificationContext";

interface NotificationCardProps {
  notification: AppNotification;
  onDismiss?: () => void;
}

export function NotificationCard({ notification, onDismiss }: NotificationCardProps) {
  const { removeNotification } = useNotification();

  const handleRemove = (e: MouseEvent) => {
    e.stopPropagation();
    if (onDismiss) {
      onDismiss();
    } else {
      removeNotification(notification.id);
    }
  };

  return (
    <div className={`notification-card ${notification.type}`}>
      <div className="notification-content">
        <p className="notification-message">{notification.message}</p>
        <span className="notification-time">{new Date(notification.timestamp).toLocaleTimeString()}</span>
      </div>
      {notification.action && (
        <button
          className="notification-action"
          onClick={(e) => {
            e.stopPropagation();
            notification.action?.onClick();
          }}
          style={{
            marginRight: "8px",
            padding: "4px 8px",
            fontSize: "0.85em",
            cursor: "pointer",
            backgroundColor: "rgba(0, 0, 0, 0.05)",
            border: "1px solid rgba(0, 0, 0, 0.1)",
            borderRadius: "4px",
            color: "inherit",
            whiteSpace: "nowrap",
            alignSelf: "center",
          }}
        >
          {notification.action.label}
        </button>
      )}
      <button className="notification-close" onClick={handleRemove as any} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
