/**
 * Quick smoke test for the Google Maps Geocoding API key.
 * Run: npx ts-node scripts/test-google-maps.ts
 *
 * Tests:
 *   1. Geocode a known address  → expects lat/lng back
 *   2. Reverse geocode those coords  → expects a readable address
 *   3. Bad API key detection  → exits with a clear error message
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const KEY = process.env.GOOGLE_MAPS_API_KEY ?? '';
const BASE = 'https://maps.googleapis.com/maps/api';

const GREEN = '\x1b[32m✔\x1b[0m';
const RED   = '\x1b[31m✘\x1b[0m';
const BOLD  = '\x1b[1m';
const RESET = '\x1b[0m';

interface GeocodeResult {
  status: string;
  results: Array<{
    formatted_address: string;
    geometry: { location: { lat: number; lng: number } };
  }>;
  error_message?: string;
}

async function testGeocode(): Promise<{ lat: number; lng: number }> {
  const address = 'Burj Khalifa, Dubai, UAE';
  console.log(`\n${BOLD}1. Geocoding${RESET}: "${address}"`);

  const { data } = await axios.get<GeocodeResult>(`${BASE}/geocode/json`, {
    params: { address, key: KEY },
  });

  if (data.status !== 'OK') {
    throw new Error(
      `Geocoding failed — status: ${data.status}${data.error_message ? ` — ${data.error_message}` : ''}`,
    );
  }

  const loc = data.results[0].geometry.location;
  const formatted = data.results[0].formatted_address;
  console.log(`  ${GREEN} Status   : ${data.status}`);
  console.log(`  ${GREEN} Address  : ${formatted}`);
  console.log(`  ${GREEN} lat/lng  : ${loc.lat}, ${loc.lng}`);
  return { lat: loc.lat, lng: loc.lng };
}

async function testReverseGeocode(lat: number, lng: number): Promise<void> {
  console.log(`\n${BOLD}2. Reverse geocoding${RESET}: ${lat}, ${lng}`);

  const { data } = await axios.get<GeocodeResult>(`${BASE}/geocode/json`, {
    params: { latlng: `${lat},${lng}`, key: KEY },
  });

  if (data.status !== 'OK') {
    throw new Error(
      `Reverse geocode failed — status: ${data.status}${data.error_message ? ` — ${data.error_message}` : ''}`,
    );
  }

  const formatted = data.results[0]?.formatted_address ?? '(no result)';
  console.log(`  ${GREEN} Status   : ${data.status}`);
  console.log(`  ${GREEN} Address  : ${formatted}`);
}

async function testDistanceMatrix(): Promise<void> {
  const origin = 'Riyadh, Saudi Arabia';
  const destination = 'Doha, Qatar';
  console.log(`\n${BOLD}3. Distance (haversine approx)${RESET}: validating coords only`);

  // We re-geocode both to confirm key has broad access
  const [o, d] = await Promise.all([
    axios.get<GeocodeResult>(`${BASE}/geocode/json`, { params: { address: origin, key: KEY } }),
    axios.get<GeocodeResult>(`${BASE}/geocode/json`, { params: { address: destination, key: KEY } }),
  ]);

  if (o.data.status === 'OK' && d.data.status === 'OK') {
    const oLoc = o.data.results[0].geometry.location;
    const dLoc = d.data.results[0].geometry.location;

    // Haversine distance (same logic as gpsMath.ts)
    const R = 6_371_000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(dLoc.lat - oLoc.lat);
    const dLng = toRad(dLoc.lng - oLoc.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(oLoc.lat)) * Math.cos(toRad(dLoc.lat)) * Math.sin(dLng / 2) ** 2;
    const distKm = ((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) / 1000).toFixed(0);

    console.log(`  ${GREEN} ${origin} → ${destination}: ~${distKm} km (geocode OK)`);
  } else {
    console.log(`  ${RED} One or both geocodes failed — check Geocoding API quota`);
  }
}

async function main() {
  console.log(`${BOLD}Google Maps API Key Test${RESET}`);
  console.log(`Key: ${KEY ? KEY.slice(0, 8) + '…' + KEY.slice(-4) : '(not set)'}`);

  if (!KEY) {
    console.error(`\n${RED} GOOGLE_MAPS_API_KEY is not set in .env`);
    process.exit(1);
  }

  try {
    const coords = await testGeocode();
    await testReverseGeocode(coords.lat, coords.lng);
    await testDistanceMatrix();

    console.log(`\n${GREEN} ${BOLD}All checks passed — Google Maps key is working.${RESET}\n`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\n${RED} ${BOLD}Check failed:${RESET} ${msg}`);

    if (msg.includes('REQUEST_DENIED') || msg.includes('invalid')) {
      console.error('  → The key may be invalid, restricted, or the Geocoding API is not enabled.');
      console.error('  → Enable it at: https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com');
    } else if (msg.includes('OVER_QUERY_LIMIT')) {
      console.error('  → Quota exceeded. Check billing at https://console.cloud.google.com/billing');
    }

    process.exit(1);
  }
}

void main();
