/**
 * Dispatch Order Store — domain boundary for dispatch views.
 *
 * DispatchView imports from here, never from the shared store directly.
 */
export { default as useOrderStore } from '../../stores/shared/orderStore';
