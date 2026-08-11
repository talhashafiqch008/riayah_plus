import { User } from 'lucide-react';
import type { PublicStaffCard } from '@/lib/api/staffProfile';
import { resolveMediaUrl } from '@/lib/api/staffProfile';

function roleLabel(role: string): string {
  return role.replace(/_/g, ' ');
}

function specialtyLine(staff: PublicStaffCard): string {
  const specialty = staff.specialties?.[0];
  if (specialty) return `${roleLabel(staff.role)} — ${specialty}`;
  return roleLabel(staff.role);
}

interface StaffPersonCardProps {
  staff: PublicStaffCard;
  /** clinician = assessments; support = sessions */
  variant?: 'clinician' | 'support' | 'compact';
  className?: string;
}

export default function StaffPersonCard({
  staff,
  variant = 'compact',
  className = '',
}: StaffPersonCardProps) {
  const languages = (staff.languages ?? []).slice(0, 4).join(', ');
  const bio = staff.bio?.trim();
  const bioLine = bio
    ? bio.length > 100
      ? `${bio.slice(0, 97)}…`
      : bio
    : null;

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
        <p className="text-xs font-medium text-teal-700 capitalize">{specialtyLine(staff)}</p>
        {variant === 'clinician' && (
          <>
            {languages ? (
              <p className="text-xs text-stone-500">Languages: {languages}</p>
            ) : null}
            {staff.yearsExperience != null ? (
              <p className="text-xs text-stone-500">
                {staff.yearsExperience} yr{staff.yearsExperience === 1 ? '' : 's'} experience
              </p>
            ) : null}
            {staff.mohLicenseNumber ? (
              <p className="text-xs text-stone-500">MOH: {staff.mohLicenseNumber}</p>
            ) : null}
            {bioLine ? <p className="text-xs text-stone-500 line-clamp-1">{bioLine}</p> : null}
          </>
        )}
        {variant === 'support' && (
          <>
            {languages ? (
              <p className="text-xs text-stone-500">Languages: {languages}</p>
            ) : null}
            {(staff.serviceAreas ?? []).length > 0 ? (
              <p className="text-xs text-stone-500">
                Areas: {(staff.serviceAreas ?? []).slice(0, 3).join(', ')}
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
