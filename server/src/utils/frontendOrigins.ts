import { env } from '../config/env';

function isPrivateLanHost(hostname: string): boolean {
  return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname);
}

function portOf(url: URL): string {
  return url.port || (url.protocol === 'https:' ? '443' : '80');
}

/** Vite dev origins (http/https localhost, 127.0.0.1, and LAN IPs on 5173). */
export function isAllowedFrontendOrigin(originOrUrl: string): boolean {
  try {
    const url = new URL(originOrUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

    const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
    const port = portOf(url);
    const devPorts = new Set(['5173', '3000']);

    try {
      const configured = new URL(env.FRONTEND_URL);
      if (url.hostname === configured.hostname && (port === portOf(configured) || devPorts.has(port))) {
        return true;
      }
    } catch {
      /* ignore invalid FRONTEND_URL */
    }

    if (localHosts.has(url.hostname) && devPorts.has(port)) return true;
    if (!env.isProd && isPrivateLanHost(url.hostname) && port === '5173') return true;

    return false;
  } catch {
    return false;
  }
}

export function corsOriginDelegate(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
): void {
  if (!origin) {
    callback(null, true);
    return;
  }
  callback(null, isAllowedFrontendOrigin(origin));
}
