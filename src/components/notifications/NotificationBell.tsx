import { useNotification } from '../../contexts/NotificationContext';
import { useEffect, useState } from 'preact/hooks';

export function NotificationBell() {
  const { unreadCount, togglePanel, isPanelOpen } = useNotification();
  const [isShaking, setIsShaking] = useState(false);
  const [prevCount, setPrevCount] = useState(unreadCount);

  useEffect(() => {
    if (unreadCount > prevCount) {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 500);
      return () => clearTimeout(timer);
    }
    setPrevCount(unreadCount);
  }, [unreadCount]);

  return (
    <div className="notification-bell-container">
      <button 
        className={`notification-bell-btn ${isPanelOpen ? 'active' : ''} ${isShaking ? 'shake' : ''}`} 
        onClick={togglePanel}
        aria-label="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>
    </div>
  );
}
