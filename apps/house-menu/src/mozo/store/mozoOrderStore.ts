/**
 * Mozo Order Store — domain boundary for mozo views.
 *
 * MozoView imports from here, never from the shared store directly.
 * Currently re-exports from shared. When mozo needs its own projections
 * or derived data, add them here instead of polluting the shared store.
 */
export { default as useOrderStore } from '../../stores/shared/orderStore';
