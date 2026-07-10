import { Request } from 'express';

export interface DeviceInfo {
  userAgent: string;
  browser: string;
  os: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'bot' | 'unknown';
  isMobile: boolean;
}

function detectBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return 'Chrome';
  if (/Firefox\//i.test(ua)) return 'Firefox';
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return 'Safari';
  if (/curl\//i.test(ua)) return 'curl';
  if (/Postman/i.test(ua)) return 'Postman';
  return 'Other';
}

function detectOs(ua: string): string {
  if (/Windows NT/i.test(ua)) return 'Windows';
  if (/Mac OS X/i.test(ua)) return 'macOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Unknown';
}

function detectDeviceType(ua: string): DeviceInfo['deviceType'] {
  if (/bot|crawler|spider/i.test(ua)) return 'bot';
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/Mobile|Android|iPhone/i.test(ua)) return 'mobile';
  if (ua.trim()) return 'desktop';
  return 'unknown';
}

export function buildDeviceInfo(req: Request): DeviceInfo {
  const userAgent = req.headers['user-agent'] ?? '';
  return buildDeviceInfoFromUserAgent(userAgent);
}

export function buildDeviceInfoFromUserAgent(userAgent: string): DeviceInfo {
  const deviceType = detectDeviceType(userAgent);

  return {
    userAgent,
    browser: detectBrowser(userAgent),
    os: detectOs(userAgent),
    deviceType,
    isMobile: deviceType === 'mobile' || deviceType === 'tablet',
  };
}

export function formatDeviceLabel(userAgent: string | null | undefined): string {
  const ua = userAgent ?? '';
  if (!ua.trim()) return 'Unknown device';
  const { browser, os } = buildDeviceInfoFromUserAgent(ua);
  return `${browser} on ${os}`;
}
