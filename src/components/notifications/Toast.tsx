import { useEffect, useState, useRef } from "preact/hooks";
import { AppNotification } from "../../types";
import { NotificationCard } from "./NotificationCard";
import { useNotification } from "../../contexts/NotificationContext";

interface ToastProps {
  notification: AppNotification;
}

export function Toast({ notification }: ToastProps) {
  const { dismissToast } = useNotification();
  const [isExiting, setIsExiting] = useState(false);
  const [saveToHistory, setSaveToHistory] = useState(true);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(5000);

  const startTimer = () => {
    startTimeRef.current = Date.now();
    timerRef.current = window.setTimeout(() => {
      setSaveToHistory(true);
      setIsExiting(true);
    }, remainingTimeRef.current);
  };

  const pauseTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    }
  };

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isExiting) {
      const timer = setTimeout(() => {
        dismissToast(notification.id, saveToHistory);
      }, 500); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isExiting, dismissToast, notification.id, saveToHistory]);

  const handleDismiss = () => {
    setSaveToHistory(false);
    setIsExiting(true);
  };

  return (
    <div
      className={`toast-item ${isExiting ? "exiting" : ""}`}
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
    >
      <NotificationCard notification={notification} onDismiss={handleDismiss} />
    </div>
  );
}
