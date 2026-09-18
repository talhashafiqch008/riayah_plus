import { useTranslation } from 'react-i18next';
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
  const isDocuments = isFamily && pageTitle === 'Documents';
  const { t } = useTranslation('family');

  const title = isDocuments ? t('placeholders.documents.title') : pageTitle;
  const body = isDocuments
    ? t('placeholders.documents.description')
    : (description ??
      `This section will be wired to live APIs in a later milestone. The ${shell.roleBadge} shell and navigation are in place.`);
  const badge = isDocuments
    ? t('placeholders.documents.badge')
    : 'Placeholder · integration';

  return (
    <div className="max-w-2xl">
      <div className="rounded-xl border bg-white p-8 shadow-sm text-center">
        <h2 className="text-xl font-semibold text-stone-900 mb-2">{title}</h2>
        <p className="text-stone-600 mb-4">{body}</p>
        <span className="inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
          {badge}
        </span>
      </div>
    </div>
  );
}
