import { prisma } from '../config/database';

/**
 * M4 pricing master: catalog rate always wins so a tampered unitCost cannot underpay.
 * Submitted cost is used only when the service is not in the catalogue.
 */
export function catalogUnitPrice(
  catalogRate: number | null | undefined,
  submitted?: number | null,
): number | null {
  if (catalogRate != null && Number.isFinite(catalogRate) && catalogRate > 0) {
    return catalogRate;
  }
  if (submitted != null && Number.isFinite(submitted) && submitted > 0) {
    return submitted;
  }
  return null;
}

export async function resolveCatalogService(serviceType: string) {
  const key = serviceType.trim();
  if (!key) return null;

  return prisma.serviceType.findFirst({
    where: {
      isActive: true,
      OR: [
        { code: { equals: key, mode: 'insensitive' } },
        { name: { equals: key, mode: 'insensitive' } },
        { type: { equals: key, mode: 'insensitive' } },
      ],
    },
    select: { id: true, code: true, name: true, type: true, baseRate: true, category: true, currency: true },
  });
}
