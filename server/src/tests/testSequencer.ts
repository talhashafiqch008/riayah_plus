import Sequencer from '@jest/test-sequencer';
import type { Test } from '@jest/test-result';

/**
 * Run unit tests before integration tests so fast feedback comes first.
 * Integration tests run serially (--runInBand) to avoid DB race conditions.
 */
export default class CustomSequencer extends Sequencer {
  sort(tests: Test[]): Test[] {
    return [...tests].sort((a, b) => {
      const aIsUnit = a.path.includes('/unit/');
      const bIsUnit = b.path.includes('/unit/');
      if (aIsUnit && !bIsUnit) return -1;
      if (!aIsUnit && bIsUnit) return 1;
      return a.path.localeCompare(b.path);
    });
  }
}
