import { Request } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { assertTenantOrgAccess } from '../middleware/tenantAccess';

export const FAMILY_ROLES = ['family', 'client', 'consumer', 'patient'] as const;
export const ADMIN_ROLES = ['admin', 'super_admin', 'support_admin'] as const;
export const COORDINATOR_ROLES = ['care_coordinator', ...ADMIN_ROLES] as const;

export function isFamilyRole(role: string): boolean {
  return (FAMILY_ROLES as readonly string[]).includes(role);
}

export function isCoordinatorRole(role: string): boolean {
  return (COORDINATOR_ROLES as readonly string[]).includes(role);
}

export function isAdminRole(role: string): boolean {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}

/** Prisma where filter: family sees episodes on their care units (or legacy patientId self). */
export function familyEpisodeWhere(userId: string) {
  return {
    OR: [{ careUnit: { familyUserId: userId } }, { patientId: userId }],
  };
}

/** Prisma where filter: family sees assessments on their care-unit episodes. */
export function familyAssessmentWhere(userId: string) {
  return {
    OR: [
      { episode: { careUnit: { familyUserId: userId } } },
      { patientId: userId },
    ],
  };
}

type EpisodeAccessRow = {
  patientId: string;
  organizationId: string | null;
  careUnitId?: string | null;
  careUnit?: { familyUserId: string } | null;
};

/**
 * Family access is via CareUnit.familyUserId (account holder), not clinical identity.
 * Staff/coordinators use tenant org checks.
 */
export async function assertEpisodeAccess(
  req: Request,
  episode: EpisodeAccessRow,
): Promise<void> {
  const role = req.user!.role;

  if (isFamilyRole(role)) {
    if (episode.patientId === req.user!.userId) return;

    let familyUserId = episode.careUnit?.familyUserId;
    if (!familyUserId && episode.careUnitId) {
      const unit = await prisma.careUnit.findUnique({
        where: { id: episode.careUnitId },
        select: { familyUserId: true },
      });
      familyUserId = unit?.familyUserId;
    }
    if (familyUserId === req.user!.userId) return;
    throw new AppError('Forbidden.', 403);
  }

  assertTenantOrgAccess(req, episode.organizationId);
}

/**
 * Ensure patientId + careRecipientId belong to the given care unit (C-3).
 * Returns the resolved account-party user id for CareEpisode.patientId.
 */
export async function resolveEpisodePartyIds(input: {
  careUnitId: string;
  careRecipientId?: string | null;
  patientId?: string | null;
}): Promise<{ patientId: string; careRecipientId: string; organizationId: string | null }> {
  const unit = await prisma.careUnit.findFirst({
    where: { id: input.careUnitId, deletedAt: null },
    select: { id: true, familyUserId: true, organizationId: true },
  });
  if (!unit) throw new AppError('Care unit not found.', 404);

  let careRecipientId = input.careRecipientId ?? null;
  if (!careRecipientId) {
    throw new AppError('careRecipientId is required.', 422);
  }

  const recipient = await prisma.careRecipient.findFirst({
    where: { id: careRecipientId, careUnitId: unit.id, deletedAt: null },
    select: { id: true, userId: true },
  });
  if (!recipient) {
    throw new AppError('Care recipient does not belong to this care unit.', 422);
  }

  // Account party for notifications / legacy User FK (M2: CareRecipient.userId = family guardian).
  const patientId = recipient.userId;
  if (input.patientId && input.patientId !== patientId && input.patientId !== unit.familyUserId) {
    throw new AppError('patientId does not match care unit / recipient account party.', 422);
  }

  return {
    patientId,
    careRecipientId: recipient.id,
    organizationId: unit.organizationId,
  };
}
