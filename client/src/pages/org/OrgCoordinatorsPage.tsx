import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { UserPlus, Mail, RefreshCw } from 'lucide-react';
import {
  createOrgCoordinator,
  listOrgCoordinators,
  resendOrgCoordinatorInvite,
  updateOrgCoordinator,
  type OrgCoordinator,
} from '@/lib/api/org';
import { isApiError } from '@/lib/errors';

export default function OrgCoordinatorsPage() {
  const { t } = useTranslation('org');
  const [rows, setRows] = useState<OrgCoordinator[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listOrgCoordinators());
    } catch (error) {
      toast.error(isApiError(error) ? error.message : t('coordinators.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createOrgCoordinator({ name: name.trim(), email: email.trim() });
      toast.success(t('coordinators.invitedToast'));
      setName('');
      setEmail('');
      await load();
    } catch (error) {
      toast.error(isApiError(error) ? error.message : t('coordinators.inviteFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-w-0 max-w-5xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">{t('coordinators.title')}</h1>
          <p className="text-stone-500 mt-1">{t('coordinators.description')}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          {t('coordinators.refresh')}
        </button>
      </div>

      <form onSubmit={(e) => void invite(e)} className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4">
        <h2 className="font-medium text-stone-900 flex items-center gap-2">
          <UserPlus className="size-4 text-teal-600" />
          {t('coordinators.inviteTitle')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <input
            required
            minLength={2}
            placeholder={t('coordinators.fullName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border border-stone-200 px-3 py-2.5"
          />
          <input
            required
            type="email"
            placeholder={t('coordinators.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-stone-200 px-3 py-2.5"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-teal-600 px-4 py-2.5 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? t('coordinators.sending') : t('coordinators.sendInvite')}
        </button>
      </form>

      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
        {loading ? (
          <p className="p-6 text-stone-500">{t('common.loading')}</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-stone-500">{t('coordinators.empty')}</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {rows.map((c) => (
              <li key={c.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-stone-900">{c.name}</p>
                  <p className="text-sm text-stone-500">{c.email}</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {c.isActive ? t('common.active') : t('common.inactive')}
                    {c.mustSetPassword ? ` · ${t('coordinators.awaitingPassword')}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  {c.mustSetPassword && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await resendOrgCoordinatorInvite(c.id);
                          toast.success(t('coordinators.resentToast'));
                        } catch (error) {
                          toast.error(
                            isApiError(error) ? error.message : t('coordinators.resendFailed'),
                          );
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-1.5 text-xs"
                    >
                      <Mail className="size-3.5" />
                      {t('coordinators.resendInvite')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await updateOrgCoordinator(c.id, { isActive: !c.isActive });
                        await load();
                      } catch (error) {
                        toast.error(
                          isApiError(error) ? error.message : t('coordinators.updateFailed'),
                        );
                      }
                    }}
                    className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs"
                  >
                    {c.isActive ? t('coordinators.deactivate') : t('coordinators.activate')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
