import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import blueprint from '@/firebase-blueprint.json';
import {
  buildFcmTokenDocId,
  sanitizeFirestoreData,
} from '@/services/firestoreService';

describe('Firebase Blueprint & Firestore Rules Synchronization', () => {
  const rulesText = fs.readFileSync(
    path.join(process.cwd(), 'firestore.rules'),
    'utf8'
  );

  test('all collections declared in firebase-blueprint.json have explicit rules', () => {
    const collectionPaths = Object.keys(blueprint.firestore);
    expect(collectionPaths.length).toBeGreaterThan(10);

    for (const colPath of collectionPaths) {
      // Extract collection name from "/collection/{docId}"
      const match = colPath.match(/^\/([a-zA-Z0-9_]+)\//);
      expect(match).toBeTruthy();
      const collectionName = match![1];
      expect(rulesText).toContain(`match /${collectionName}/`);
    }
  });

  test('firestore.rules enforces default deny catch-all and fcmTokens schema validation', () => {
    expect(rulesText).toContain('match /{document=**}');
    expect(rulesText).toContain('allow read, write: if false;');
    expect(rulesText).toContain('function isValidFcmToken(data)');
    expect(rulesText).toContain("data.registrationMode in ['fcm', 'web_push_fallback']");
  });
});

describe('Supabase SQL Migrations Verification', () => {
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const combinedSql = migrationFiles
    .map((f) => fs.readFileSync(path.join(migrationsDir, f), 'utf8'))
    .join('\n\n');

  test('includes all 4 sequential migrations including preventive maintenance, trips, and FCM', () => {
    expect(migrationFiles).toEqual([
      '20261108000000_initial_schema.sql',
      '20261108000001_seed_data.sql',
      '20261114000000_vehicle_checklists.sql',
      '20261121000000_preventive_trips_fcm.sql',
    ]);
  });

  test('supports CNH category B and all operational tables with RLS enabled', () => {
    expect(combinedSql).toContain("CHECK (cnh_category IN ('B', 'C', 'D', 'E'))");

    const requiredTables = [
      'public.users',
      'public.vehicles',
      'public.drivers',
      'public.daily_rates',
      'public.tolls',
      'public.daily_reports',
      'public.deliveries',
      'public.report_expenses',
      'public.payments',
      'public.vehicle_checklists',
      'public.maintenance_records',
      'public.trip_requests',
      'public.fcm_tokens',
    ];

    for (const table of requiredTables) {
      expect(combinedSql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
      expect(combinedSql).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    }

    expect(combinedSql).toContain('next_preventive_maintenance_km');
    expect(combinedSql).toContain('next_preventive_maintenance_date');
  });
});

describe('Cross-Screen Payload & Document ID Safety', () => {
  test('sanitizeFirestoreData strips undefined recursively while preserving falsy primitives', () => {
    const raw = {
      id: 'chk-1',
      odometerKm: 0,
      filtersReplaced: false,
      generalNotes: undefined,
      nested: {
        notes: undefined,
        label: 'Freios',
      },
      items: [
        { id: '1', notes: undefined, status: 'ok' },
        { id: '2', notes: 'Vazamento', status: 'anomaly' },
      ],
    };

    const clean = sanitizeFirestoreData(raw) as Record<string, unknown>;
    expect('generalNotes' in clean).toBe(false);
    expect(clean.odometerKm).toBe(0);
    expect(clean.filtersReplaced).toBe(false);
    expect((clean.nested as Record<string, unknown>).label).toBe('Freios');
    expect('notes' in (clean.nested as Record<string, unknown>)).toBe(false);
    expect(
      'notes' in ((clean.items as Array<Record<string, unknown>>)[0])
    ).toBe(false);
  });

  test('buildFcmTokenDocId satisfies Firestore ID constraints', () => {
    const id = buildFcmTokenDocId(
      'drv-01-very-long-driver-identifier-with@chars',
      'fcm_token_very_long_value_1234567890_abcdef'
    );
    expect(id.length).toBeLessThanOrEqual(128);
    expect(id).toMatch(/^[a-zA-Z0-9_-]+$/);
  });
});
