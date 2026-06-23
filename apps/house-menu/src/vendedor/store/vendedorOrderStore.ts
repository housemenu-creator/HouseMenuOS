/**
 * Vendedor Order Store — domain boundary for vendedor views.
 *
 * VendedorView imports from here, never from the shared store directly.
 */
export { default as useOrderStore } from '../../stores/shared/orderStore';
