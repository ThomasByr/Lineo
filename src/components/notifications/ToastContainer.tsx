import { useNotification } from '../../contexts/NotificationContext';
import { Toast } from './Toast';

export function ToastContainer() {
  const { toasts } = useNotification();

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <Toast key={toast.id} notification={toast} />
      ))}
    </div>
  );
}
