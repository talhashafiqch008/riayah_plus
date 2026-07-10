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

  return (
    <div className="max-w-2xl">
      <div className="rounded-xl border bg-white p-8 shadow-sm text-center">
        <h2 className="text-xl font-semibold text-stone-900 mb-2">{pageTitle}</h2>
        <p className="text-stone-600 mb-4">
          {description ??
            `This section will be wired to live APIs in Milestone 2. The ${shell.roleBadge} shell and navigation are in place.`}
        </p>
        <span className="inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
          Placeholder · M2 integration
        </span>
      </div>
    </div>
  );
}
