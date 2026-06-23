/**
 * Delivery Order Store — domain boundary for delivery views.
 *
 * Delivery hooks and views import from here, never from the shared store directly.
 */
export { default as useOrderStore } from '../../stores/shared/orderStore';
