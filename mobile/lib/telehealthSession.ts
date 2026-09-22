/**
 * Tracks an active telehealth disconnect callback so logout / token-expiry
 * can tear down media without relying solely on unmount (MOB-16).
 */
let activeTeardown: (() => void) | null = null;

export function registerTelehealthSession(teardown: () => void): () => void {
  activeTeardown = teardown;
  return () => {
    if (activeTeardown === teardown) activeTeardown = null;
  };
}

export function teardownTelehealthSession(): void {
  const fn = activeTeardown;
  activeTeardown = null;
  try {
    fn?.();
  } catch {
    /* ignore */
  }
}
