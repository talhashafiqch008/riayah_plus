import { ROLE_SHELLS } from '@/config/proposalRoleShells';

interface RoleShellPlaceholderProps {
  shellKey: keyof typeof ROLE_SHELLS;
  pageTitle: string;
  description?: string;
}

export default function RoleShellPlaceholder({
  shellKey,
  pageTitle,
  description,
}: RoleShellPlaceholderProps) {
  const shell = ROLE_SHELLS[shellKey];
  const isFamily = shellKey === 'family';
  const isLaterMilestone =
    isFamily &&
    (pageTitle === 'Care Plans' || pageTitle === 'Messages' || pageTitle === 'Documents');

  return (
    <div className="max-w-2xl">
      <div className="rounded-xl border bg-white p-8 shadow-sm text-center">
        <h2 className="text-xl font-semibold text-stone-900 mb-2">{pageTitle}</h2>
        <p className="text-stone-600 mb-4">
          {description ??
            `This section will be wired to live APIs in a later milestone. The ${shell.roleBadge} shell and navigation are in place.`}
        </p>
        <span className="inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
          {isLaterMilestone
            ? pageTitle === 'Care Plans'
              ? 'Coming soon · Milestone 3'
              : pageTitle === 'Messages'
                ? 'Coming soon · Milestone 4'
                : 'Placeholder · expanding soon'
            : 'Placeholder · integration'}
        </span>
      </div>
    </div>
  );
}
