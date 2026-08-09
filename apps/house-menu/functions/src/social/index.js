/**
 * Social Media Module — Barrel Export
 *
 * Re-exports all social media Cloud Functions for import
 * into the main functions/src/index.js.
 */

export { socialPublishInstagram, socialPublishFacebook, socialDisconnect } from './meta-publisher.js';
export { socialScheduler } from './scheduler.js';
