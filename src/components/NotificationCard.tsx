import { AppNotification } from '../types';
import { useNotification } from '../contexts/NotificationContext';

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
        <span className="notification-time">
          {new Date(notification.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <button className="notification-close" onClick={handleRemove as any} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
