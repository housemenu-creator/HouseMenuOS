/**
 * Worker Order Store — re-export from the canonical shared store.
 *
 * Worker (dashboard) code imports from here. All other domains
 * import from their own domain store (mozo/store, kds/store, etc.)
 */
export { default, type OrderState } from '../../stores/shared/orderStore';
