/**
 * Migration: Add assignedGroups to Panel documents
 * 
 * Purpose:
 *   Panel.assignedGroups[] was added to the schema to give panels
 *   first-class knowledge of their assigned groups (mirroring Group.panel).
 *   This migration backfills existing Panel documents by reading
 *   Group.panel references and populating the new field.
 *
 * Safety:
 *   - Additive only — no fields are removed or renamed
 *   - Idempotent — safe to run multiple times
 *   - Non-destructive — existing data is never overwritten
 *   - MongoDB handles the new field gracefully (defaults to [])
 *
 * Usage:
 *   node scripts/migratePanel_addAssignedGroups.js
 *
 * Rollback:
 *   db.panels.updateMany({}, { $unset: { assignedGroups: "" } })
 */

const mongoose = require('mongoose');
const path = require('path');

// Load database config
const { connectDB, closeDB } = require('../config/database');

async function migrate() {
  console.log('[Migration] Starting: Add assignedGroups to Panel documents');
  console.log('---');

  try {
    await connectDB();

    const Panel = require('../models/Panel');
    const Group = require('../models/Group');

    // Step 1: Find all active panels
    const panels = await Panel.find({});
    console.log(`[Migration] Found ${panels.length} total panel documents`);

    if (panels.length === 0) {
      console.log('[Migration] No panels found — nothing to migrate. Done.');
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const panel of panels) {
      try {
        // Step 2: Check if panel already has assignedGroups populated
        if (panel.assignedGroups && panel.assignedGroups.length > 0) {
          console.log(`  Panel #${panel.panelNumber} (sem ${panel.semester}, ${panel.academicYear}): already has ${panel.assignedGroups.length} groups — skipping`);
          skippedCount++;
          continue;
        }

        // Step 3: Find all groups that reference this panel
        const groups = await Group.find({
          panel: panel._id,
          isActive: true
        }).select('_id');

        if (groups.length === 0) {
          console.log(`  Panel #${panel.panelNumber} (sem ${panel.semester}, ${panel.academicYear}): no groups assigned — skipping`);
          skippedCount++;
          continue;
        }

        // Step 4: Backfill assignedGroups
        panel.assignedGroups = groups.map(g => ({
          group: g._id,
          assignedAt: new Date()
        }));

        await panel.save();
        console.log(`  Panel #${panel.panelNumber} (sem ${panel.semester}, ${panel.academicYear}): backfilled ${groups.length} groups ✓`);
        migratedCount++;

      } catch (err) {
        console.error(`  Panel #${panel.panelNumber}: ERROR — ${err.message}`);
        errorCount++;
      }
    }

    console.log('---');
    console.log(`[Migration] Complete:`);
    console.log(`  Migrated: ${migratedCount}`);
    console.log(`  Skipped:  ${skippedCount}`);
    console.log(`  Errors:   ${errorCount}`);

  } catch (error) {
    console.error('[Migration] Fatal error:', error);
    process.exit(1);
  } finally {
    await closeDB();
  }
}

migrate();
