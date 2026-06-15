import { ref, get, set, remove } from 'firebase/database';
import { realtimeDB as db } from '@house/db';
import { tenantRef } from '../src/lib/tenantService.js';

async function cleanupDuplicateUsers() {
  const usersRef = tenantRef('users');
  const snapshot = await get(usersRef);
  const allUsers = snapshot.val();
  if (!allUsers) {
    console.log('No users found.');
    return;
  }

  const entries = Object.entries(allUsers);
  const byEmail = {};

  for (const [id, u] of entries) {
    const email = u.email;
    if (!byEmail[email]) byEmail[email] = [];
    byEmail[email].push({ id, ...u });
  }

  const duplicates = Object.entries(byEmail).filter(([, users]) => users.length > 1);
  if (duplicates.length === 0) {
    console.log('No duplicate users found.');
    return;
  }

  console.log(`Found ${duplicates.length} email(s) with duplicate users:`);

  for (const [email, users] of duplicates) {
    console.log(`\n${email}:`);
    const withUid = users.filter(u => u.firebaseUid);
    const withoutUid = users.filter(u => !u.firebaseUid);

    console.log(`  Users with firebaseUid: ${withUid.length}`);
    console.log(`  Users without firebaseUid: ${withoutUid.length}`);

    if (withUid.length > 0 && withoutUid.length > 0) {
      const keep = withoutUid[0];
      const removeThese = withUid.filter(u => u.id !== keep.id);

      console.log(`  Keeping: ${keep.id} (${keep.name || 'no name'})`);
      console.log(`  Adding firebaseUid: ${withUid[0].firebaseUid}`);

      await set(ref(db, tenantPath(`users/${keep.id}/firebaseUid`)), withUid[0].firebaseUid);

      for (const dup of removeThese) {
        console.log(`  Removing duplicate: ${dup.id} (${dup.firebaseUid})`);
        await remove(ref(db, tenantPath(`users/${dup.id}`)));

        const membershipsSnapshot = await get(tenantRef('memberships'));
        const memberships = membershipsSnapshot.val();
        if (memberships) {
          for (const [memId, m] of Object.entries(memberships)) {
            if (m.userId === dup.id) {
              await remove(ref(db, tenantPath(`memberships/${memId}`)));
              console.log(`  Removed membership: ${memId}`);
            }
          }
        }
      }
    }
  }

  console.log('\nCleanup complete.');
}

cleanupDuplicateUsers().catch(console.error);
