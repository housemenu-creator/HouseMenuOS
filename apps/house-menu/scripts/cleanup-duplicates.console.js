// Paste this in the browser console while logged in as admin on house-menuapp.web.app
// Or better, just check and do it manually from the Firebase Console.

(async () => {
  const { ref, get, set, remove } = await import('firebase/database');
  const { realtimeDB: db } = await import('@house/db');

  const snap = await get(ref(db, 'tenants/default/users'));
  const users = snap.val();
  if (!users) return console.log('No users.');

  const byEmail = {};
  for (const [id, u] of Object.entries(users)) {
    if (!byEmail[u.email]) byEmail[u.email] = [];
    byEmail[u.email].push({ id, ...u });
  }

  let cleaned = 0;
  for (const [email, list] of Object.entries(byEmail)) {
    if (list.length < 2) continue;
    console.log(`Duplicados para ${email}:`, list.map(u => ({ id: u.id, hasUid: !!u.firebaseUid, name: u.name })));

    const withUid = list.find(u => u.firebaseUid);
    const withoutUid = list.find(u => !u.firebaseUid);
    if (withUid && withoutUid) {
      // Link firebaseUid al que fue creado desde admin (sin firebaseUid)
      const keep = withoutUid;
      const removeId = withUid.id;
      await set(ref(db, `tenants/default/users/${keep.id}/firebaseUid`), withUid.firebaseUid);
      await remove(ref(db, `tenants/default/users/${removeId}`));
      // Clean up membership
      const memSnap = await get(ref(db, 'tenants/default/memberships'));
      if (memSnap.val()) {
        for (const [mid, m] of Object.entries(memSnap.val())) {
          if (m.userId === removeId) await remove(ref(db, `tenants/default/memberships/${mid}`));
        }
      }
      cleaned++;
      console.log(`✅ Limpiado: se quedó ${keep.id}, se eliminó ${removeId}`);
    }
  }
  console.log(`\nListo. ${cleaned} duplicado(s) limpiado(s).`);
})();
