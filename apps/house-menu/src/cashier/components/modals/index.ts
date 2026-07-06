import { lazy } from 'react';

export const QuickPayModal = lazy(() => import('./QuickPayModal').then(m => ({ default: m.QuickPayModal })));
export const CancelOrderModal = lazy(() => import('./CancelOrderModal').then(m => ({ default: m.CancelOrderModal })));
export const TransferTableModal = lazy(() => import('./TransferTableModal').then(m => ({ default: m.TransferTableModal })));
export const VerifyPaymentModal = lazy(() => import('./VerifyPaymentModal').then(m => ({ default: m.VerifyPaymentModal })));
export const ReceiptModal = lazy(() => import('./ReceiptModal').then(m => ({ default: m.ReceiptModal })));
export const SplitBillModal = lazy(() => import('./SplitBillModal').then(m => ({ default: m.SplitBillModal })));
export const NewOrderModal = lazy(() => import('./NewOrderModal').then(m => ({ default: m.NewOrderModal })));
