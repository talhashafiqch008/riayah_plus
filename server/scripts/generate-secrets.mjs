#!/usr/bin/env node
/**
 * Generate high-entropy secrets for JWT / admin break-glass rotation.
 * Usage: node scripts/generate-secrets.mjs
 */
import crypto from 'crypto';

function secret(bytes = 48) {
  return crypto.randomBytes(bytes).toString('base64url');
}

console.log('# Paste into your secret store / .env (do not commit):');
console.log(`JWT_ACCESS_SECRET=${secret()}`);
console.log(`JWT_REFRESH_SECRET=${secret()}`);
console.log(`ADMIN_SECRET=${secret()}`);
console.log('# During rotation, keep the old values as:');
console.log('# JWT_ACCESS_SECRET_PREVIOUS=<old access secret>');
console.log('# JWT_REFRESH_SECRET_PREVIOUS=<old refresh secret>');
console.log('# Remove *_PREVIOUS after the access/refresh TTL window elapses.');
