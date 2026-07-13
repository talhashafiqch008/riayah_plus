import { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Layers,
  MapPin,
  Plus,
  Trash2,
  Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/admin/api';
import { isApiError } from '@/lib/errors';

interface CountMeta {
  clinics?: number;
  users?: number;
  departments?: number;
}

interface Department {
  id: string;
  name: string;
  isActive: boolean;
  _count?: { users: number };
}

interface Clinic {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  isActive: boolean;
  departments?: Department[];
  _count?: { users: number; departments: number };
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  clinics?: Clinic[];
  _count?: CountMeta;
}

type ModalMode =
  | { type: 'org-create' }
  | { type: 'org-edit'; org: Organization }
  | { type: 'clinic-create'; orgId: string }
  | { type: 'clinic-edit'; clinic: Clinic }
  | { type: 'dept-create'; clinicId: string }
  | { type: 'dept-edit'; department: Department };

const emptyOrgForm = {
  name: '',
  email: '',
  phone: '',
  address: '',
  website: '',
  logoUrl: '',
};

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [expandedClinics, setExpandedClinics] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [modal, setModal] = useState<ModalMode | null>(null);
  const [form, setForm] = useState(emptyOrgForm);
  const [saving, setSaving] = useState(false);

  const loadOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminApi.get('/admin/organizations');
      const data = (response.data ?? response) as Organization[];
      setOrganizations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load organizations:', error);
      toast.error('Failed to load organizations');
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOrganizationDetail = useCallback(async (orgId: string) => {
    try {
      setLoadingDetail(true);
      const response = await adminApi.get(`/admin/organizations/${orgId}`);
      const data = (response.data ?? response) as Organization;
      setSelectedOrg(data);
      setSelectedOrgId(orgId);
    } catch (error) {
      console.error('Failed to load organization detail:', error);
      toast.error('Failed to load organization details');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    if (selectedOrgId) {
      loadOrganizationDetail(selectedOrgId);
    }
  }, [selectedOrgId, loadOrganizationDetail]);

  const refresh = async () => {
    await loadOrganizations();
    if (selectedOrgId) await loadOrganizationDetail(selectedOrgId);
  };

  const openOrgCreate = () => {
    setForm(emptyOrgForm);
    setModal({ type: 'org-create' });
  };

  const openOrgEdit = (org: Organization) => {
    setForm({
      name: org.name,
      email: org.email ?? '',
      phone: org.phone ?? '',
      address: org.address ?? '',
      website: org.website ?? '',
      logoUrl: org.logoUrl ?? '',
    });
    setModal({ type: 'org-edit', org });
  };

  const openClinicCreate = (orgId: string) => {
    setForm({ ...emptyOrgForm, name: '' });
    setModal({ type: 'clinic-create', orgId });
  };

  const openClinicEdit = (clinic: Clinic) => {
    // ORG-004: clinic has no email/website — only name, phone, address
    setForm({
      ...emptyOrgForm,
      name: clinic.name,
      phone: clinic.phone ?? '',
      address: clinic.address ?? '',
    });
    setModal({ type: 'clinic-edit', clinic });
  };

  const openDeptCreate = (clinicId: string) => {
    setForm({ ...emptyOrgForm, name: '' });
    setModal({ type: 'dept-create', clinicId });
  };

  const openDeptEdit = (department: Department) => {
    setForm({ ...emptyOrgForm, name: department.name });
    setModal({ type: 'dept-edit', department });
  };

  const handleSave = async () => {
    if (!modal) return;
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      if (modal.type === 'org-create') {
        await adminApi.post('/admin/organizations', {
          name: form.name.trim(),
          email: form.email || undefined,
          phone: form.phone || undefined,
          address: form.address || undefined,
          website: form.website || undefined,
          logoUrl: form.logoUrl || undefined,
        });
        toast.success('Organization created');
      } else if (modal.type === 'org-edit') {
        await adminApi.patch(`/admin/organizations/${modal.org.id}`, {
          name: form.name.trim(),
          email: form.email || null,
          phone: form.phone || null,
          address: form.address || null,
          website: form.website || null,
          logoUrl: form.logoUrl || null,
        });
        toast.success('Organization updated');
      } else if (modal.type === 'clinic-create') {
        await adminApi.post(`/admin/organizations/${modal.orgId}/clinics`, {
          name: form.name.trim(),
          phone: form.phone || undefined,
          address: form.address || undefined,
        });
        toast.success('Clinic created');
      } else if (modal.type === 'clinic-edit') {
        await adminApi.patch(`/admin/clinics/${modal.clinic.id}`, {
          name: form.name.trim(),
          phone: form.phone || null,
          address: form.address || null,
        });
        toast.success('Clinic updated');
      } else if (modal.type === 'dept-create') {
        await adminApi.post(`/admin/clinics/${modal.clinicId}/departments`, {
          name: form.name.trim(),
        });
        toast.success('Department created');
      } else if (modal.type === 'dept-edit') {
        await adminApi.patch(`/admin/departments/${modal.department.id}`, {
          name: form.name.trim(),
        });
        toast.success('Department updated');
      }

      setModal(null);
      await refresh();
    } catch (error) {
      if (isApiError(error)) {
        toast.error(error.message || 'Save failed');
      } else {
        toast.error('Save failed');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type: 'org' | 'clinic' | 'department', id: string) => {
    const labels = { org: 'organization', clinic: 'clinic', department: 'department' };
    if (!window.confirm(`Delete this ${labels[type]}? This cannot be undone.`)) return;

    try {
      if (type === 'org') {
        await adminApi.delete(`/admin/organizations/${id}`);
        if (selectedOrgId === id) {
          setSelectedOrgId(null);
          setSelectedOrg(null);
        }
      } else if (type === 'clinic') {
        await adminApi.delete(`/admin/clinics/${id}`);
      } else {
        await adminApi.delete(`/admin/departments/${id}`);
      }
      toast.success(`${labels[type]} deleted`);
      await refresh();
    } catch (error) {
      if (isApiError(error)) {
        toast.error(error.message || 'Delete failed');
      } else {
        toast.error('Delete failed');
      }
    }
  };

  const toggleActive = async (type: 'org' | 'clinic' | 'department', id: string, isActive: boolean) => {
    try {
      const path =
        type === 'org'
          ? `/admin/organizations/${id}`
          : type === 'clinic'
            ? `/admin/clinics/${id}`
            : `/admin/departments/${id}`;
      await adminApi.patch(path, { isActive: !isActive });
      toast.success(isActive ? 'Deactivated' : 'Activated');
      await refresh();
    } catch (error) {
      if (isApiError(error)) {
        toast.error(error.message || 'Update failed');
      }
    }
  };

  const modalTitle =
    modal?.type === 'org-create'
      ? 'New Organization'
      : modal?.type === 'org-edit'
        ? 'Edit Organization'
        : modal?.type === 'clinic-create'
          ? 'New Clinic / Branch'
          : modal?.type === 'clinic-edit'
            ? 'Edit Clinic / Branch'
            : modal?.type === 'dept-create'
              ? 'New Department'
              : modal?.type === 'dept-edit'
                ? 'Edit Department'
                : '';

  const showOrgOnlyFields = modal?.type === 'org-create' || modal?.type === 'org-edit';
  const showClinicPhone =
    modal?.type === 'clinic-create' || modal?.type === 'clinic-edit';
  const showAddressField =
    modal?.type === 'org-create' ||
    modal?.type === 'org-edit' ||
    modal?.type === 'clinic-create' ||
    modal?.type === 'clinic-edit';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full size-12 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Organizations</h1>
          <p className="text-sm text-stone-500">
            Manage organizations, clinics (branches), and departments
          </p>
        </div>
        <button
          type="button"
          onClick={openOrgCreate}
          className="flex items-center rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500"
        >
          <Plus className="mr-2 size-4" />
          Add Organization
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-4 py-3">
            <h2 className="font-semibold text-stone-900">All Organizations</h2>
          </div>
          <div className="divide-y max-h-[70vh] overflow-y-auto">
            {organizations.length === 0 ? (
              <p className="p-4 text-sm text-stone-500">No organizations yet.</p>
            ) : (
              organizations.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => setSelectedOrgId(org.id)}
                  className={`w-full px-4 py-3 text-left hover:bg-stone-50 ${
                    selectedOrgId === org.id ? 'bg-teal-50 border-l-4 border-teal-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-stone-900">{org.name}</p>
                      <p className="text-xs text-stone-500">{org.slug}</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        org.isActive ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {org.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-stone-400">
                    {org._count?.clinics ?? 0} clinics · {org._count?.users ?? 0} users
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-white shadow-sm min-h-[400px]">
          {!selectedOrgId ? (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-stone-500">
              <Building2 className="mb-3 size-10 text-stone-300" />
              <p>Select an organization to manage its hierarchy</p>
            </div>
          ) : loadingDetail || !selectedOrg ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="animate-spin rounded-full size-10 border-b-2 border-teal-600" />
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-stone-900">{selectedOrg.name}</h2>
                  <p className="text-sm text-stone-500">{selectedOrg.slug}</p>
                  {selectedOrg.address && (
                    <p className="mt-1 flex items-center gap-1 text-sm text-stone-600">
                      <MapPin className="size-3.5" />
                      {selectedOrg.address}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openOrgEdit(selectedOrg)}
                    className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-stone-50"
                  >
                    <Pencil className="mr-1.5 size-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive('org', selectedOrg.id, selectedOrg.isActive)}
                    className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-stone-50"
                  >
                    {selectedOrg.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete('org', selectedOrg.id)}
                    className="inline-flex items-center rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="mr-1.5 size-3.5" />
                    Delete
                  </button>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                    <Layers className="size-4 text-teal-600" />
                    Clinics / Branches
                  </h3>
                  <button
                    type="button"
                    onClick={() => openClinicCreate(selectedOrg.id)}
                    className="inline-flex items-center text-sm font-medium text-teal-600 hover:text-teal-700"
                  >
                    <Plus className="mr-1 size-4" />
                    Add Clinic
                  </button>
                </div>

                {(selectedOrg.clinics ?? []).length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-stone-500">
                    No clinics yet. Add a branch to this organization.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(selectedOrg.clinics ?? []).map((clinic) => {
                      const expanded = expandedClinics[clinic.id] ?? true;
                      return (
                        <div key={clinic.id} className="rounded-lg border">
                          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-stone-50">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedClinics((prev) => ({
                                  ...prev,
                                  [clinic.id]: !expanded,
                                }))
                              }
                              className="flex flex-1 items-center gap-2 text-left"
                            >
                              {expanded ? (
                                <ChevronDown className="size-4 text-stone-500" />
                              ) : (
                                <ChevronRight className="size-4 text-stone-500" />
                              )}
                              <div>
                                <p className="font-medium text-stone-900">{clinic.name}</p>
                                <p className="text-xs text-stone-500">
                                  {clinic._count?.departments ?? clinic.departments?.length ?? 0}{' '}
                                  departments · {clinic._count?.users ?? 0} users
                                </p>
                              </div>
                            </button>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => openClinicEdit(clinic)}
                                className="rounded p-1.5 hover:bg-white"
                                aria-label="Edit clinic"
                              >
                                <Pencil className="size-4 text-stone-500" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete('clinic', clinic.id)}
                                className="rounded p-1.5 hover:bg-white"
                                aria-label="Delete clinic"
                              >
                                <Trash2 className="size-4 text-red-500" />
                              </button>
                            </div>
                          </div>

                          {expanded && (
                            <div className="px-4 py-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-stone-700">Departments</p>
                                <button
                                  type="button"
                                  onClick={() => openDeptCreate(clinic.id)}
                                  className="inline-flex items-center text-xs font-medium text-teal-600 hover:text-teal-700"
                                >
                                  <Plus className="mr-1 size-3" />
                                  Add Department
                                </button>
                              </div>
                              {(clinic.departments ?? []).length === 0 ? (
                                <p className="text-sm text-stone-500">No departments.</p>
                              ) : (
                                (clinic.departments ?? []).map((dept) => (
                                  <div
                                    key={dept.id}
                                    className="flex items-center justify-between rounded-md border px-3 py-2"
                                  >
                                    <div>
                                      <p className="text-sm font-medium text-stone-900">{dept.name}</p>
                                      <p className="text-xs text-stone-500">
                                        {dept._count?.users ?? 0} users
                                      </p>
                                    </div>
                                    <div className="flex gap-1">
                                      <button
                                        type="button"
                                        onClick={() => openDeptEdit(dept)}
                                        className="rounded p-1 hover:bg-stone-50"
                                        aria-label="Edit department"
                                      >
                                        <Pencil className="size-3.5 text-stone-500" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDelete('department', dept.id)}
                                        className="rounded p-1 hover:bg-stone-50"
                                        aria-label="Delete department"
                                      >
                                        <Trash2 className="size-3.5 text-red-500" />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-stone-900 mb-4">{modalTitle}</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="org-name" className="block text-sm font-medium text-stone-700 mb-1">
                  Name
                </label>
                <input
                  id="org-name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                />
              </div>
              {showOrgOnlyFields && (
                <>
                  <div>
                    <label htmlFor="org-email" className="block text-sm font-medium text-stone-700 mb-1">
                      Email
                    </label>
                    <input
                      id="org-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                    />
                  </div>
                  <div>
                    <label htmlFor="org-phone" className="block text-sm font-medium text-stone-700 mb-1">
                      Phone
                    </label>
                    <input
                      id="org-phone"
                      value={form.phone}
                      onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                    />
                  </div>
                  <div>
                    <label htmlFor="org-website" className="block text-sm font-medium text-stone-700 mb-1">
                      Website
                    </label>
                    <input
                      id="org-website"
                      value={form.website}
                      onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                    />
                  </div>
                  <div>
                    <label htmlFor="org-logo" className="block text-sm font-medium text-stone-700 mb-1">
                      Logo URL
                    </label>
                    <input
                      id="org-logo"
                      value={form.logoUrl}
                      onChange={(e) => setForm((prev) => ({ ...prev, logoUrl: e.target.value }))}
                      placeholder="https://…"
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                    />
                    {form.logoUrl ? (
                      <img
                        src={form.logoUrl}
                        alt="Logo preview"
                        className="mt-2 h-12 w-12 rounded object-contain border border-stone-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : null}
                  </div>
                </>
              )}
              {showClinicPhone && (
                <div>
                  <label htmlFor="clinic-phone" className="block text-sm font-medium text-stone-700 mb-1">
                    Phone
                  </label>
                  <input
                    id="clinic-phone"
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                  />
                </div>
              )}
              {showAddressField && (
                <div>
                  <label htmlFor="org-address" className="block text-sm font-medium text-stone-700 mb-1">
                    Address
                  </label>
                  <input
                    id="org-address"
                    value={form.address}
                    onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                  />
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-md border px-4 py-2 text-sm hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
