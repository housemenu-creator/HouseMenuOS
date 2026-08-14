// Limpieza de empleados branch legacy → tenant (residuo del modelo viejo).
// Paste this in the browser console while logged in as admin on house-menuapp.web.app
//
// Qué hace:
// 1. Busca TODOS los records en branches/{branchId}/employees que tienen `userId`
//    (el modelo viejo duplicaba: branch record + tenant record linkeado).
// 2. Migra los campos flat que el tenant record no tiene (phone, docType, docNum,
//    area, station, startDate, hourlyRate, notes, status) + schedule + goals + pin.
// 3. Borra el branch record. El tenant record es la única fuente de verdad.
//
// Los branch employees SIN userId (empleados sin cuenta) NO se tocan:
// siguen siendo legacy soportado por el tab (listado merge + CRUD fallback).

(async () => {
  const { ref, get, set, update, remove } = await import('firebase/database');
  const { realtimeDB: db } = await import('@house/db');

  // Tenants donde existe el tenant record de un userId (puede ser multi-tenant)
  async function findTenantRecords(userId) {
    const results = [];
    if (!userId) return results;
    const memSnap = await get(ref(db, `global/users/${userId}/memberships`));
    const memberships = memSnap.val();
    if (!memberships) return results;
    for (const tenantId of Object.keys(memberships)) {
      const empSnap = await get(ref(db, `tenants/${tenantId}/employees/${userId}`));
      if (empSnap.exists()) results.push(tenantId);
    }
    return results;
  }

  const FLAT_FIELDS = ['phone', 'docType', 'docNum', 'area', 'station', 'startDate', 'hourlyRate', 'notes', 'status', 'statusEnd'];

  const branchesSnap = await get(ref(db, 'branches'));
  const branches = branchesSnap.val();
  if (!branches) return console.log('No branches.');

  let migrated = 0;
  let orphaned = 0;

  for (const [branchId, branchData] of Object.entries(branches)) {
    const employees = branchData?.employees;
    if (!employees) continue;

    for (const [pushId, rec] of Object.entries(employees)) {
      if (!rec.userId) continue; // legacy sin cuenta → no tocar

      const tenantIds = await findTenantRecords(rec.userId);
      if (tenantIds.length === 0) {
        // Huérfano: el tab lo muestra con id = userId; sin tenant record no hay
        // dónde migrar el flat. Se deja intacto (consistente con el merge).
        orphaned++;
        console.log(`⚠️  Huérfano (sin tenant record): branches/${branchId}/employees/${pushId} → userId ${rec.userId}`);
        continue;
      }

      for (const tenantId of tenantIds) {
        const empPath = `tenants/${tenantId}/employees/${rec.userId}`;
        const empSnap = await get(ref(db, empPath));
        const emp = empSnap.val();

        const updates = {};
        for (const k of FLAT_FIELDS) {
          if (rec[k] !== undefined && emp?.[k] === undefined) updates[k] = rec[k];
        }
        // PIN legacy (solo si el tenant record no tiene hash de PIN todavía)
        if (rec.pin && emp && ((emp.profile?.pinHash || emp.pinHash) == null)) {
          updates['profile/pin'] = rec.pin;
          updates.pin = rec.pin;
        }
        // schedule branch → tenant (si el tenant no tiene)
        if (rec.schedule && !emp?.schedule) updates.schedule = rec.schedule;

        if (Object.keys(updates).length > 0) {
          await update(ref(db, empPath), updates);
        }

        // goals branch → tenant (si el tenant no tiene)
        const goalsSnap = await get(ref(db, `branches/${branchId}/employees/${pushId}/goals`));
        if (goalsSnap.exists()) {
          const tenantGoalsSnap = await get(ref(db, `${empPath}/goals`));
          if (!tenantGoalsSnap.exists()) {
            await set(ref(db, `${empPath}/goals`), goalsSnap.val());
          }
        }
      }

      await remove(ref(db, `branches/${branchId}/employees/${pushId}`));
      migrated++;
      console.log(`✅ Migrado branches/${branchId}/employees/${pushId} (userId ${rec.userId}) → tenants ${tenantIds.join(', ')}`);
    }
  }

  console.log(`\nListo. ${migrated} branch record(s) migrado(s) y eliminado(s), ${orphaned} huérfano(s) sin tocar.`);
  console.log('Los branch employees SIN userId (sin cuenta) siguen como legacy: no se modificaron.');
})();