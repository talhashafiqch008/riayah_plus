import { User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { PublicStaffCard } from '@/lib/api/staffProfile';
import { resolveMediaUrl } from '@/lib/api/staffProfile';
import { familyStaffRoleLabel } from '@/lib/familyLanguage';

function specialtyLine(staff: PublicStaffCard, roleText: string): string {
  const specialty = staff.specialties?.[0];
  if (specialty) return `${roleText} — ${specialty}`;
  return roleText;
}

interface StaffPersonCardProps {
  staff: PublicStaffCard;
  /** clinician = assessments; support = sessions */
  variant?: 'clinician' | 'support' | 'compact';
  className?: string;
  /** Translate chrome labels (Languages, Areas, role slug) via family i18n. */
  localize?: boolean;
}

export default function StaffPersonCard({
  staff,
  variant = 'compact',
  className = '',
  localize = false,
}: StaffPersonCardProps) {
  const { t } = useTranslation('family');
  const languages = (staff.languages ?? []).slice(0, 4).join(', ');
  const bio = staff.bio?.trim();
  const bioLine = bio
    ? bio.length > 100
      ? `${bio.slice(0, 97)}…`
      : bio
    : null;

  const roleText = localize
    ? familyStaffRoleLabel(staff.role)
    : staff.role.replace(/_/g, ' ');

  return (
    <div
      className={`flex gap-3 rounded-xl border border-stone-200 bg-white p-3 ${className}`}
    >
      <div className="size-14 shrink-0 overflow-hidden rounded-full bg-teal-100 flex items-center justify-center">
        {staff.avatar ? (
          <img
            src={resolveMediaUrl(staff.avatar) ?? undefined}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <User className="size-7 text-teal-700" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="font-semibold text-stone-900 truncate">{staff.name}</p>
        <p className="text-xs font-medium text-teal-700 capitalize">
          {specialtyLine(staff, roleText)}
        </p>
        {variant === 'clinician' && (
          <>
            {languages ? (
              <p className="text-xs text-stone-500">
                {localize ? t('staffCard.languages', { list: languages }) : `Languages: ${languages}`}
              </p>
            ) : null}
            {staff.yearsExperience != null ? (
              <p className="text-xs text-stone-500">
                {localize
                  ? t('staffCard.experience', { count: staff.yearsExperience })
                  : `${staff.yearsExperience} yr${staff.yearsExperience === 1 ? '' : 's'} experience`}
              </p>
            ) : null}
            {staff.mohLicenseNumber ? (
              <p className="text-xs text-stone-500">
                {localize
                  ? t('staffCard.moh', { number: staff.mohLicenseNumber })
                  : `MOH: ${staff.mohLicenseNumber}`}
              </p>
            ) : null}
            {bioLine ? <p className="text-xs text-stone-500 line-clamp-1">{bioLine}</p> : null}
          </>
        )}
        {variant === 'support' && (
          <>
            {languages ? (
              <p className="text-xs text-stone-500">
                {localize ? t('staffCard.languages', { list: languages }) : `Languages: ${languages}`}
              </p>
            ) : null}
            {(staff.serviceAreas ?? []).length > 0 ? (
              <p className="text-xs text-stone-500">
                {localize
                  ? t('staffCard.areas', {
                      list: (staff.serviceAreas ?? []).slice(0, 3).join(', '),
                    })
                  : `Areas: ${(staff.serviceAreas ?? []).slice(0, 3).join(', ')}`}
              </p>
            ) : null}
            {bioLine ? <p className="text-xs text-stone-500 line-clamp-1">{bioLine}</p> : null}
          </>
        )}
        {variant === 'compact' && languages ? (
          <p className="text-xs text-stone-500">{languages}</p>
        ) : null}
      </div>
    </div>
  );
}
