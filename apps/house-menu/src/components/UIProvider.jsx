import { ToastProvider } from './ToastContext';
import ConfirmDialog from './ConfirmDialog';
import { CustomizationProvider } from '../context/CustomizationContext';

export default function UIProvider({ children }) {
  return (
    <CustomizationProvider>
      <ToastProvider>
        {children}
        <ConfirmDialog />
      </ToastProvider>
    </CustomizationProvider>
  );
}
