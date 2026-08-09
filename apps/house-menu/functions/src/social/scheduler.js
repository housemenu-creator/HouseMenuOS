/**
 * Social Scheduler — Scheduled Post Publisher
 *
 * Runs every 5 minutes via onSchedule. Checks for pending scheduled posts
 * whose scheduledAt time has passed and publishes them.
 *
 * IMPORTANT: Currently processes in DEMO mode (logs + marks as published).
 * Real auto-publishing requires Meta OAuth tokens (Phase 0).
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import admin from 'firebase-admin';

const db = admin.database();

export const socialScheduler = onSchedule(
  {
    schedule: '*/5 * * * *',
    region: 'us-central1',
    timeZone: 'America/Lima',
  },
  async () => {
    logger.info('🔁 Social scheduler: checking for pending posts...');

    try {
      const branchesSnap = await db.ref('branches').once('value');
      const branches = branchesSnap.val() || {};
      let published = 0;

      for (const branchId of Object.keys(branches)) {
        const scheduledSnap = await db
          .ref(`branches/${branchId}/social/scheduled`)
          .once('value');
        const scheduled = scheduledSnap.val();
        if (!scheduled) continue;

        const now = Date.now();

        for (const [postId, post] of Object.entries(scheduled)) {
          if (post.status !== 'pending' && post.status !== 'draft') continue;
          if (!post.scheduledAt || post.scheduledAt > now) continue;

          // Attempt to publish
          try {
            // In DEMO mode, just mark as published
            const updates = {
              status: 'published',
              publishedAt: now,
              updatedAt: now,
              demo: true,
            };

            // If we have real tokens, attempt real publish
            const igToken = await db
              .ref(`branches/${branchId}/social/connections/instagram/accessToken`)
              .once('value');
            const fbToken = await db
              .ref(`branches/${branchId}/social/connections/facebook/accessToken`)
              .once('value');

            if ((post.platform === 'instagram' || post.platform === 'both') && igToken.val()) {
              // Real IG publish would go here
              logger.info(`[SCHEDULER] Would publish to IG: ${post.caption?.substring(0, 40)}`);
            }
            if ((post.platform === 'facebook' || post.platform === 'both') && fbToken.val()) {
              // Real FB publish would go here
              logger.info(`[SCHEDULER] Would publish to FB: ${post.message || post.caption?.substring(0, 40)}`);
            }

            await db.ref(`branches/${branchId}/social/scheduled/${postId}`).update(updates);
            published++;
            logger.info(`✅ Scheduled post ${postId} published (demo mode)`);
          } catch (err) {
            logger.error(`❌ Failed to publish scheduled post ${postId}:`, err);
            await db.ref(`branches/${branchId}/social/scheduled/${postId}`).update({
              status: 'failed',
              error: err.message,
              updatedAt: now,
            });
          }
        }
      }

      logger.info(`🔁 Social scheduler: ${published} post(s) published`);
    } catch (err) {
      logger.error('🔁 Social scheduler error:', err);
    }
  }
);
