#!/usr/bin/env node

/**
 * migrate-auth.mjs — Unify user + employee data models.
 *
 * Migrates from the OLD dual structure:
 *   tenants/{tenant}/users/{pushId}        (system users)
 *   branches/{branch}/employees/{pushId}   (branch employees)
 *   tenants/{tenant}/memberships/{pushId}  (role/branch assignment)
 *
 * To the NEW unified structure:
 *   tenants/{tenant}/employees/{firebaseUid}
 *
 * REQUIRED: Firebase service account key via GOOGLE_APPLICATION_CREDENTIALS
 * REQUIRED: RTDB backup taken before running
 *
 * Usage:
 *   node scripts/migrate-auth.mjs --dry-run   # preview only
 *   node scripts/migrate-auth.mjs --apply      # write to RTDB
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

// ── Bootstrap ──────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run');
const APPLY = process.argv.includes('--apply');

if (!DRY_RUN && !APPLY) {
  console.log('Usage: node scripts/migrate-auth.mjs --dry-run | --apply');
  process.exit(1);
}
if (APPLY) {
  console.log('');
  console.log('  ⚠️  WARNING: --apply will write to RTDB.');
  console.log('  ⚠️  Ensure you have a backup before proceeding.');
  console.log('  ⚠️  Type "yes" to continue or Ctrl+C to abort.');
  console.log('');
  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => rl.question('  Continue? ', resolve));
  rl.close();
  if (answer.toLowerCase() !== 'yes') {
    console.log('  Aborted.');
    process.exit(0);
  }
}

const app = initializeApp({ credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS) });
const rtdb = getDatabase(app);

// ── Stats ──────────────────────────────────────────────────

const stats = { tenants: 0, usersFound: 0, employeesFound: 0, migrated: 0, skipped: 0, errors: 0 };

// ── Helpers ────────────────────────────────────────────────

async function read(path) {
  const snap = await rtdb.ref(path).once('value');
  return snap.val();
}

function write(path, data) {
  return rtdb.ref(path).set(data);
}

function del(path) {
  return rtdb.ref(path).remove();
}

// ── Migration Logic ────────────────────────────────────────

async function migrateTenant(tenantId) {
  stats.tenants++;
  console.log(`\n  📦 Tenant: ${tenantId}`);

  // 1. Read system users
  const users = await read(`tenants/${tenantId}/users`) || {};
  const usersCount = Object.keys(users).length;
  stats.usersFound += usersCount;
  console.log(`     Users: ${usersCount}`);

  // 2. Read memberships
  const memberships = await read(`tenants/${tenantId}/memberships`) || {};

  // 3. Read all branch employees across every branch
  const branchesData = await read('branches') || {};
  const allBranchEmployees = {};
  for (const [branchId, branch] of Object.entries(branchesData)) {
    if (branch.employees) {
      for (const [empId, emp] of Object.entries(branch.employees)) {
        allBranchEmployees[empId] = { ...emp, _branchId: branchId };
      }
    }
  }
  stats.employeesFound += Object.keys(allBranchEmployees).length;
  console.log(`     Branch employees: ${Object.keys(allBranchEmployees).length}`);

  // 4. Merge by email or firebaseUid
  const byEmail = new Map();
  const byFirebaseUid = new Map();

  // Index system users
  for (const [pushId, u] of Object.entries(users)) {
    const key = u.firebaseUid || pushId;
    const membership = Object.values(memberships).find((m) => m.userId === pushId);
    const employee = Object.values(allBranchEmployees).find((e) => e.userId === pushId || e.email === u.email);

    const merged = {
      profile: {
        name: u.name || employee?.name || 'Unknown',
        email: u.email || employee?.email || null,
        phone: employee?.phone || null,
        pinHash: u.pinHash || null,
        pin: u.pin || employee?.pin || null,
        active: u.active !== false && employee?.active !== false,
        createdAt: u.createdAt || employee?.createdAt || null,
        updatedAt: Date.now(),
      },
      role: membership?.roleId || employee?.role || u.role || 'kitchen',
      homeBranch: employee?._branchId || null,
      branches: membership?.branchIds || (employee?._branchId ? { [employee._branchId]: true } : { hq: true }),
      firebaseUid: u.firebaseUid || null,
    };

    // Carry over portal data if available
    if (employee) {
      const branchId = employee._branchId;
      // Schedule
      if (employee.schedule) merged.schedule = employee.schedule;
      // Goals
      if (employee.goals) merged.goals = employee.goals;
      // Attendance will be migrated separately
    }

    if (u.firebaseUid) {
      byFirebaseUid.set(u.firebaseUid, merged);
    } else {
      byEmail.set(u.email || pushId, merged);
    }
  }

  // 5. Add branch employees that didn't match any system user
  for (const [empId, emp] of Object.entries(allBranchEmployees)) {
    const matchedByEmail = emp.email && byEmail.has(emp.email);
    const matchedByUid = emp.userId && byEmail.has(emp.userId);
    if (!matchedByEmail && !matchedByUid) {
      // This employee has no matching system user — still migrate them
      const merged = {
        profile: {
          name: emp.name || 'Unknown',
          email: emp.email || null,
          phone: emp.phone || null,
          pinHash: emp.pinHash || null,
          pin: emp.pin || null,
          active: emp.active !== false,
          createdAt: emp.createdAt || null,
          updatedAt: Date.now(),
        },
        role: emp.role || 'kitchen',
        homeBranch: emp._branchId || null,
        branches: emp._branchId ? { [emp._branchId]: true } : { hq: true },
        firebaseUid: null,
      };
      if (emp.schedule) merged.schedule = emp.schedule;
      if (emp.goals) merged.goals = emp.goals;
      byEmail.set(emp.email || `no-email-${empId}`, merged);
    }
  }

  // 6. Write to new structure
  for (const [key, employee] of byEmail) {
    const uid = employee.firebaseUid || `pending-${key}`;
    const path = `tenants/${tenantId}/employees/${uid}`;

    if (DRY_RUN) {
      console.log(`     📄 Would write: ${path} → ${employee.profile.name} (${employee.role})`);
      stats.migrated++;
      continue;
    }

    try {
      await write(path, employee);
      stats.migrated++;
    } catch (err) {
      console.error(`     ❌ Error writing ${path}:`, err.message);
      stats.errors++;
    }
  }

  // 6.5. Sync _role_cache entries for each employee and add _meta to branches
  const metaWritten = new Set();
  for (const [key, employee] of byEmail) {
    const uid = employee.firebaseUid || `pending-${key}`;
    const empBranches = employee.branches || { hq: true };

    for (const branchId of Object.keys(empBranches)) {
      const roleCachePath = `branches/${branchId}/_role_cache/${uid}`;
      if (!DRY_RUN) {
        try {
          await write(roleCachePath, employee.role);
          stats.migrated++;
        } catch (err) {
          console.error(`     ❌ Error writing ${roleCachePath}:`, err.message);
          stats.errors++;
        }
      } else {
        console.log(`     📄 Would write: ${roleCachePath} → ${employee.role}`);
        stats.migrated++;
      }

      // Add _meta to each branch once
      if (!metaWritten.has(branchId)) {
        metaWritten.add(branchId);
        const metaPath = `branches/${branchId}/_meta`;
        if (!DRY_RUN) {
          try {
            await write(metaPath, { tenantId });
          } catch (err) {
            console.error(`     ❌ Error writing ${metaPath}:`, err.message);
            stats.errors++;
          }
        } else {
          console.log(`     📄 Would write: ${metaPath} → { tenantId: "${tenantId}" }`);
        }
      }
    }
  }

  // 7. Migrate attendance records per branch
  for (const [branchId, branch] of Object.entries(branchesData)) {
    if (!branch.attendance) continue;
    for (const [empId, records] of Object.entries(branch.attendance)) {
      // Find the target firebaseUid for this employee
      const emp = allBranchEmployees[empId];
      let targetUid = null;
      if (emp?.userId) {
        const userEntry = Object.entries(users).find(([, u]) => u.firebaseUid === emp.userId || u.email === emp.email);
        targetUid = userEntry?.[1]?.firebaseUid || `pending-${emp.email || empId}`;
      } else {
        targetUid = `pending-${empId}`;
      }
      for (const [date, record] of Object.entries(records)) {
        const attPath = `tenants/${tenantId}/employees/${targetUid}/attendance/${date}`;
        if (DRY_RUN) {
          console.log(`     📄 Would write attendance: ${attPath}`);
          continue;
        }
        try {
          await write(attPath, {
            ...record,
            employeeId: targetUid,
          });
        } catch (err) {
          console.error(`     ❌ Error writing attendance ${attPath}:`, err.message);
          stats.errors++;
        }
      }
    }
  }
}

// ── Main ──────────────────────────────────────────────────

try {
  // Discover tenants
  const tenants = await read('tenants');
  if (!tenants) {
    console.log('No tenants found in RTDB.');
    process.exit(0);
  }

  for (const tenantId of Object.keys(tenants)) {
    await migrateTenant(tenantId);
  }

  console.log('\n── Migration Report ──');
  console.log(`  Tenants processed:  ${stats.tenants}`);
  console.log(`  Users found:        ${stats.usersFound}`);
  console.log(`  Branch employees:   ${stats.employeesFound}`);
  console.log(`  Records migrated:   ${stats.migrated}`);
  console.log(`  Skipped:            ${stats.skipped}`);
  console.log(`  Errors:             ${stats.errors}`);

  if (DRY_RUN) {
    console.log('\n  ✅ Dry-run complete. No data was written.');
    console.log('  Run with --apply to execute the migration.');
  } else {
    console.log('\n  ✅ Migration complete.');
  }

  process.exit(stats.errors > 0 ? 1 : 0);
} catch (err) {
  console.error('Fatal error:', err);
  process.exit(1);
}
