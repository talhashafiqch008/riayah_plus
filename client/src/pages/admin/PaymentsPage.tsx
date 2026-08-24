import { Link, useSearchParams } from 'react-router-dom';
import AdminReconciliationPage from './ReconciliationPage';
import MarketplacePaymentsPage from './MarketplacePaymentsPage';

type Tab = 'reconciliation' | 'marketplace';

export default function AdminPaymentsPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') === 'marketplace' ? 'marketplace' : 'reconciliation') as Tab;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setParams({})}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            tab === 'reconciliation' ? 'bg-teal-600 text-white' : 'bg-stone-100 text-stone-600'
          }`}
        >
          Invoice reconciliation
        </button>
        <button
          type="button"
          onClick={() => setParams({ tab: 'marketplace' })}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            tab === 'marketplace' ? 'bg-teal-600 text-white' : 'bg-stone-100 text-stone-600'
          }`}
        >
          Marketplace payments
        </button>
        <Link
          to="/admin/invoices"
          className="ml-auto rounded-full border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700"
        >
          Invoice oversight
        </Link>
        <Link
          to="/admin/pricing"
          className="rounded-full border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700"
        >
          Pricing
        </Link>
      </div>
      {tab === 'reconciliation' ? <AdminReconciliationPage /> : <MarketplacePaymentsPage />}
    </div>
  );
}
