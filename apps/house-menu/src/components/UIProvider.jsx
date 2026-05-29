import { ToastProvider } from './ToastContext';
import ConfirmDialog from './ConfirmDialog';

export default function UIProvider({ children }) {
  return (
    <ToastProvider>
      {children}
      <ConfirmDialog />
    </ToastProvider>
  );
}
