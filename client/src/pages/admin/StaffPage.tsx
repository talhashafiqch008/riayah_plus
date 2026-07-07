
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, UserX, Search } from "lucide-react";
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/admin/api';

interface StaffMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
}

function splitName(name?: string): { firstName: string; lastName: string } {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}

function normalizeStaffMember(raw: Record<string, unknown>): StaffMember {
  const fromName = splitName(raw.name as string | undefined);
  const firstName =
    (raw.firstName as string) ||
    (raw.first_name as string) ||
    fromName.firstName;
  const lastName =
    (raw.lastName as string) ||
    (raw.last_name as string) ||
    fromName.lastName;

  return {
    id: String(raw.id ?? ''),
    email: String(raw.email ?? ''),
    firstName,
    lastName,
    role: String(raw.role ?? '').toUpperCase(),
    createdAt: String(raw.createdAt ?? raw.created_at ?? ''),
  };
}

function extractStaffList(response: unknown): StaffMember[] {
  const payload = response as Record<string, unknown> | null | undefined;
  if (!payload) return [];

  let items: unknown[] = [];
  const data = payload.data as Record<string, unknown> | unknown[] | undefined;

  if (Array.isArray(data)) {
    items = data;
  } else if (data && Array.isArray((data as Record<string, unknown>).items)) {
    items = (data as Record<string, unknown>).items as unknown[];
  } else if (Array.isArray(payload.items)) {
    items = payload.items;
  }

  return items.map((item) => normalizeStaffMember(item as Record<string, unknown>));
}

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const response = await adminApi.get('/admin/staff');
      setStaff(extractStaffList(response));
    } catch (error) {
      console.error("Failed to fetch staff:", error);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = staff.filter((member) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (member.firstName || '').toLowerCase().includes(q) ||
      (member.lastName || '').toLowerCase().includes(q) ||
      (member.email || '').toLowerCase().includes(q);
    const matchesRole = selectedRole === "ALL" || member.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const roles = ["ALL", "SUPPORT_WORKER", "NURSE", "DOCTOR", "CLEANER", "GARDENER", "TRAINER", "STAFF", "ADMIN"];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full size-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Staff Management</h1>
          <p className="text-sm text-stone-500">Manage your internal staff pool</p>
        </div>
        <button
          onClick={() => toast('Staff creation coming soon', { icon: '🔧' })}
          className="flex items-center rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500"
        >
          <Plus className="mr-2 size-4" />
          Add Staff
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full max-w-md items-center rounded-lg border bg-white px-3 py-2">
          <Search className="mr-2 size-5 text-stone-400" />
          <input
            type="text"
            placeholder="Search staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${selectedRole === role ? "bg-teal-600 text-white" : "bg-white text-stone-700 hover:bg-stone-50 border"}`}
            >
              {role.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-stone-200">
          <thead className="bg-stone-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                Staff Member
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-stone-200">
            {filteredStaff.map((member) => {
              const initials =
                `${member.firstName?.[0] ?? ''}${member.lastName?.[0] ?? ''}` ||
                member.email?.[0]?.toUpperCase() ||
                '?';

              return (
                <tr key={member.id} className="hover:bg-stone-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="size-10 rounded-full bg-teal-100 flex items-center justify-center">
                        <span className="text-sm font-semibold text-teal-700">{initials}</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-stone-900">
                          {[member.firstName, member.lastName].filter(Boolean).join(' ') || member.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                      {member.role.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                    {member.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                    {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => toast('Edit staff coming soon', { icon: '🔧' })}
                      className="text-teal-600 hover:text-teal-900 mr-3"
                    >
                      <Edit className="size-4 inline" />
                    </button>
                    <button
                      onClick={() => toast('Delete staff coming soon', { icon: '🔧' })}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="size-4 inline" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredStaff.length === 0 && (
        <div className="text-center py-12 rounded-xl border bg-white">
          <UserX className="mx-auto size-12 text-stone-400 mb-4" />
          <h3 className="text-lg font-semibold text-stone-900 mb-2">No staff found</h3>
          <p className="text-sm text-stone-500">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
