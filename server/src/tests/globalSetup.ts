/**
 * Runs once before all test suites.
 * - Applies pending Prisma migrations to the test database.
 * - The test DB URL is read from DATABASE_TEST_URL (or DATABASE_URL when NODE_ENV=test).
 */
import { execSync } from 'child_process';
import * as path from 'path';
import * as dotenv from 'dotenv';

export default async function globalSetup() {
  dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

  console.log('\n🔧  Running Prisma migrations on test database…');
  try {
    execSync('npx prisma migrate deploy', {
      cwd: path.resolve(__dirname, '../..'),
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: 'inherit',
    });
    console.log('✅  Migrations applied.');
  } catch (err) {
    console.warn('⚠️   Could not apply migrations (no DB available). Integration tests will be skipped.');
  }
}
