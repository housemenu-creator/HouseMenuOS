/**
 * Social Media Publisher — Meta (Instagram + Facebook)
 *
 * Cloud Functions for publishing content via Meta Graph API.
 * Deployed via Firebase Cloud Functions (Gen 2).
 *
 * Prerequisites:
 *   - Meta Business account with Instagram + Facebook connected
 *   - Long-lived Page Access Token stored in RTDB at:
 *     branches/{branchId}/social/connections/{platform}/accessToken
 *   - Functions config: firebase functions:config:set meta.app_id="xxx" meta.app_secret="xxx"
 *
 * IMPORTANT: These functions currently STUB the Meta API calls.
 * Real publishing requires a deployed backend with the access tokens
 * obtained via OAuth. See Phase 0 (OAuth setup) for the manual steps.
 */

import { onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import admin from 'firebase-admin';

const db = admin.database();

/**
 * Retrieve stored access token for a platform under a branch.
 */
async function getAccessToken(branchId, platform) {
  try {
    const snap = await db
      .ref(`branches/${branchId}/social/connections/${platform}/accessToken`)
      .once('value');
    return snap.val();
  } catch (e) {
    logger.warn(`Error reading token for ${platform}/${branchId}:`, e);
    return null;
  }
}

/**
 * Publish to Instagram.
 *
 * Expects: { branchId, imageUrl, caption }
 *
 * Flow:
 *   1. Get IG Business Account ID from stored connection
 *   2. POST /{ig-user-id}/media (image + caption)
 *   3. POST /{ig-user-id}/media_publish (media_container_id)
 */
export const socialPublishInstagram = onCall(
  { region: 'us-central1', secrets: ['META_APP_SECRET'] },
  async (request) => {
    const { branchId, imageUrl, caption } = request.data;
    if (!branchId || !imageUrl || !caption) {
      throw new Error('Missing required params: branchId, imageUrl, caption');
    }

    // In demo/pre-OAuth mode, return demo response
    const accessToken = await getAccessToken(branchId, 'instagram');
    if (!accessToken) {
      logger.info(`[DEMO] Instagram publish for ${branchId}: ${caption?.substring(0, 50)}`);
      return {
        id: `demo_${Date.now()}`,
        platform: 'instagram',
        caption: caption?.substring(0, 50),
        likes: Math.floor(Math.random() * 300) + 50,
        comments: Math.floor(Math.random() * 40) + 5,
        reach: Math.floor(Math.random() * 2000) + 500,
        publishedAt: Date.now(),
        status: 'published',
        demo: true,
      };
    }

    // REAL: Publish via Meta Graph API
    try {
      // Step 1: Get IG Business Account ID
      const userIdSnap = await db
        .ref(`branches/${branchId}/social/connections/instagram/igBusinessAccountId`)
        .once('value');
      const igUserId = userIdSnap.val();
      if (!igUserId) throw new Error('IG Business Account ID not found');

      // Step 2: Create media container
      const createRes = await fetch(
        `https://graph.facebook.com/v22.0/${igUserId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: imageUrl,
            caption,
            access_token: accessToken,
          }),
        }
      );
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(`IG media creation failed: ${JSON.stringify(createData)}`);

      const containerId = createData.id;

      // Step 3: Publish container
      const publishRes = await fetch(
        `https://graph.facebook.com/v22.0/${igUserId}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: containerId,
            access_token: accessToken,
          }),
        }
      );
      const publishData = await publishRes.json();
      if (!publishRes.ok) throw new Error(`IG publish failed: ${JSON.stringify(publishData)}`);

      const mediaId = publishData.id;

      // Step 4: Log to RTDB
      const postRef = db.ref(`branches/${branchId}/social/posts`).push();
      const post = {
        id: postRef.key,
        platform: 'instagram',
        mediaId,
        containerId,
        caption,
        publishedAt: Date.now(),
        status: 'published',
      };
      await postRef.set(post);

      logger.info(`Instagram publish OK: ${mediaId} for branch ${branchId}`);
      return post;
    } catch (err) {
      logger.error(`Instagram publish error:`, err);
      const failRef = db.ref(`branches/${branchId}/social/posts`).push();
      await failRef.set({
        platform: 'instagram',
        caption,
        error: err.message,
        publishedAt: Date.now(),
        status: 'failed',
      });
      throw new Error(`Instagram publish failed: ${err.message}`);
    }
  }
);

/**
 * Publish to Facebook Page.
 *
 * Expects: { branchId, message, imageUrl, link }
 */
export const socialPublishFacebook = onCall(
  { region: 'us-central1', secrets: ['META_APP_SECRET'] },
  async (request) => {
    const { branchId, message, imageUrl, link } = request.data;
    if (!branchId || !message) {
      throw new Error('Missing required params: branchId, message');
    }

    const accessToken = await getAccessToken(branchId, 'facebook');
    if (!accessToken) {
      logger.info(`[DEMO] Facebook publish for ${branchId}: ${message?.substring(0, 50)}`);
      return {
        id: `demo_fb_${Date.now()}`,
        platform: 'facebook',
        message: message?.substring(0, 50),
        likes: Math.floor(Math.random() * 150) + 20,
        comments: Math.floor(Math.random() * 20) + 3,
        reach: Math.floor(Math.random() * 1200) + 300,
        publishedAt: Date.now(),
        status: 'published',
        demo: true,
      };
    }

    try {
      const pageIdSnap = await db
        .ref(`branches/${branchId}/social/connections/facebook/pageId`)
        .once('value');
      const pageId = pageIdSnap.val();
      if (!pageId) throw new Error('Facebook Page ID not found');

      const body = {
        message,
        access_token: accessToken,
        ...(imageUrl ? { attached_media: imageUrl } : {}),
        ...(link ? { link } : {}),
      };

      const res = await fetch(
        `https://graph.facebook.com/v22.0/${pageId}/feed`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(`FB publish failed: ${JSON.stringify(data)}`);

      const postRef = db.ref(`branches/${branchId}/social/posts`).push();
      const post = {
        id: postRef.key,
        platform: 'facebook',
        fbPostId: data.id,
        message,
        publishedAt: Date.now(),
        status: 'published',
      };
      await postRef.set(post);

      logger.info(`Facebook publish OK: ${data.id} for branch ${branchId}`);
      return post;
    } catch (err) {
      logger.error(`Facebook publish error:`, err);
      const failRef = db.ref(`branches/${branchId}/social/posts`).push();
      await failRef.set({
        platform: 'facebook',
        message,
        error: err.message,
        publishedAt: Date.now(),
        status: 'failed',
      });
      throw new Error(`Facebook publish failed: ${err.message}`);
    }
  }
);

/**
 * Disconnect a platform (revoke token).
 */
export const socialDisconnect = onCall(
  { region: 'us-central1' },
  async (request) => {
    const { branchId, platform } = request.data;
    if (!branchId || !platform) {
      throw new Error('Missing branchId or platform');
    }

    const accessToken = await getAccessToken(branchId, platform);
    if (accessToken) {
      // Revoke at Meta
      try {
        await fetch(
          `https://graph.facebook.com/v22.0/me/permissions?access_token=${accessToken}`,
          { method: 'DELETE' }
        );
      } catch (e) {
        logger.warn(`Token revocation for ${platform} failed (may already be invalid):`, e);
      }
    }

    // Clear connection data
    await db.ref(`branches/${branchId}/social/connections/${platform}`).remove();

    logger.info(`Disconnected ${platform} for branch ${branchId}`);
    return { success: true, platform };
  }
);
