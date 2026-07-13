
import { useState, useEffect } from 'react';
import { getAdminAllUsers, getPendingVerifications, verifyDocument } from '@/lib/api';
import { Check, X, Shield, FileText, Search, Ban, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { client } from '@/lib/api/client';

interface AdminUser {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  emailVerifiedAt?: string | null;
  createdAt?: string;
  verificationStatus?: string;
  providerProfile?: { hourlyRate?: number; averageRating?: number } | null;
}

interface PendingDoc {
  id: string;
  user_id?: string;
  type?: string;
  status?: string;
  url?: string;
  user?: { name?: string; firstName?: string; lastName?: string };
}

async function patchUser(id: string, data: Record<string, unknown>) {
  const res = await client.patch(`/admin/users/${id}`, data);
  return res.data;
}

export default function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'verifications'>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const response = await getAdminAllUsers();
        const usersData = response.data || response;
        setUsers(Array.isArray(usersData) ? usersData : []);
      } else {
        const data = await getPendingVerifications();
        setPendingDocs(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (docId: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      await verifyDocument(docId, status);
      loadData();
    } catch (error) {
      if (isApiError(error)) {
        toast.error(error.message || 'Verification action failed');
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Verification action failed');
      }
    }
  };

  const handleSuspend = async (user: AdminUser) => {
    const next = !user.isActive;
    try {
      await patchUser(user.id, { isActive: next });
      toast.success(next ? `${user.name} reactivated` : `${user.name} suspended`);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isActive: next } : u));
    } catch {
      toast.error('Failed to update user status');
    }
  };

  const handleVerifyEmail = async (user: AdminUser) => {
    try {
      await patchUser(user.id, { emailVerifiedAt: new Date().toISOString() });
      toast.success(`${user.name}'s email marked as verified`);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, emailVerifiedAt: new Date().toISOString() } : u));
    } catch {
      toast.error('Failed to verify email');
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !debouncedSearch ||
      (typeof user.name === 'string' && user.name.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
      (typeof user.email === 'string' && user.email.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
      (typeof user.role === 'string' && user.role.toLowerCase().includes(debouncedSearch.toLowerCase()));

    const role = typeof user.role === 'string' ? user.role.toLowerCase() : '';
    const matchesRole = roleFilter === 'all' || role === roleFilter.toLowerCase();

    return matchesSearch && matchesRole;
  });

  const initials = (name?: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : parts[0][0];
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold text-stone-900 tracking-tight">User Management</h1>
            <p className="text-stone-500 mt-1 font-medium">Manage user accounts, roles, and verification requests.</p>
          </div>

          <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-stone-200 inline-flex">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab === 'users' ? 'bg-stone-900 text-white shadow-md transform scale-105' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'}`}
            >
              All Users
            </button>
            <button
              onClick={() => setActiveTab('verifications')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2 ${activeTab === 'verifications' ? 'bg-stone-900 text-white shadow-md transform scale-105' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'}`}
            >
              Pending Request
              {pendingDocs.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] flex items-center justify-center font-black ${activeTab === 'verifications' ? 'bg-red-500 text-white' : 'bg-red-100 text-red-600'}`}>
                  {pendingDocs.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {activeTab === 'users' && (
          <div className="bg-white rounded-[2rem] border border-stone-200/60 shadow-xl shadow-stone-200/40 overflow-hidden flex flex-col">
            {/* Toolbar */}
            <div className="p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/50 backdrop-blur-xl">
              <div className="relative w-full max-w-md group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="size-5 text-stone-400 group-focus-within:text-teal-500 transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="Search by name, email, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-stone-50 border-transparent text-stone-900 placeholder-stone-400 focus:bg-white focus:border-teal-500/20 focus:ring-4 focus:ring-teal-500/10 rounded-2xl transition-all font-medium text-sm outline-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="appearance-none bg-stone-50 border border-transparent text-stone-700 font-bold text-sm rounded-2xl pl-4 pr-10 py-3.5 outline-none focus:bg-white focus:border-teal-500/20 focus:ring-4 focus:ring-teal-500/10 cursor-pointer transition-all hover:bg-stone-100"
                  >
                    <option value="all">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="doctor">Doctor</option>
                    <option value="nurse">Nurse</option>
                    <option value="provider">Provider</option>
                    <option value="clinical_staff">Clinical Staff</option>
                    <option value="support_worker">Support Worker</option>
                    <option value="client">Client</option>
                    <option value="family">Family</option>
                    <option value="care_coordinator">Coordinator</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-stone-400">
                    <svg className="size-4 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="h-8 w-px bg-stone-200 mx-1 hidden sm:block" />
                <span className="text-xs font-bold text-stone-400 uppercase tracking-widest px-2 hidden sm:block">
                  {filteredUsers.length} Users
                </span>
              </div>
            </div>

            {loading ? (
              <div className="p-20 flex flex-col items-center justify-center">
                <div className="size-10 border-4 border-teal-500/30 border-t-teal-600 rounded-full animate-spin mb-4" />
                <p className="text-stone-400 font-medium animate-pulse">Loading users directory…</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-stone-50">
                  <thead className="bg-stone-50/50">
                    <tr>
                      <th className="px-8 py-4 text-left text-xs font-black text-stone-400 uppercase tracking-widest">User Identity</th>
                      <th className="px-6 py-4 text-left text-xs font-black text-stone-400 uppercase tracking-widest">Role</th>
                      <th className="px-6 py-4 text-left text-xs font-black text-stone-400 uppercase tracking-widest">Email Verified</th>
                      <th className="px-6 py-4 text-left text-xs font-black text-stone-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-black text-stone-400 uppercase tracking-widest">Joined On</th>
                      <th className="px-6 py-4 text-left text-xs font-black text-stone-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-stone-50">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className={`group hover:bg-stone-50/80 transition-colors ${!user.isActive ? 'opacity-60' : ''}`}>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="size-12 flex-shrink-0 bg-gradient-to-br from-stone-100 to-stone-200 group-hover:from-teal-50 group-hover:to-emerald-100 transition-colors rounded-2xl flex items-center justify-center text-stone-500 group-hover:text-teal-700 font-black text-lg shadow-sm border border-stone-100">
                              {initials(user.name)}
                            </div>
                            <div className="ml-5">
                              <div className="text-sm font-bold text-stone-900 group-hover:text-teal-900 transition-colors">
                                {user.name || '—'}
                              </div>
                              <div className="text-xs font-medium text-stone-500 font-mono mt-0.5">{user.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                            user.role === 'admin' || user.role === 'super_admin'
                              ? 'bg-purple-100 text-purple-700 border border-purple-200'
                              : user.role === 'doctor' || user.role === 'nurse' || user.role === 'clinical_staff'
                              ? 'bg-blue-50 text-blue-700 border border-blue-100'
                              : user.role === 'client' || user.role === 'family' || user.role === 'patient'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-stone-100 text-stone-600 border border-stone-200'
                          }`}>
                            {user.role?.replace(/_/g, ' ') ?? '—'}
                          </span>
                        </td>

                        <td className="px-6 py-5 whitespace-nowrap">
                          {user.emailVerifiedAt ? (
                            <div className="flex items-center gap-2">
                              <div className="size-1.5 rounded-full bg-emerald-500" />
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">Verified</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="size-1.5 rounded-full bg-amber-500" />
                              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-md">Pending</span>
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-5 whitespace-nowrap">
                          {user.isActive !== false ? (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">Active</span>
                          ) : (
                            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md">Suspended</span>
                          )}
                        </td>

                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="text-sm font-bold text-stone-600">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                          </div>
                        </td>

                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {!user.emailVerifiedAt && (
                              <button
                                onClick={() => void handleVerifyEmail(user)}
                                title="Verify email"
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                              >
                                <CheckCircle className="size-4" />
                              </button>
                            )}
                            <button
                              onClick={() => void handleSuspend(user)}
                              title={user.isActive !== false ? 'Suspend user' : 'Reactivate user'}
                              className={`p-1.5 rounded-lg transition-colors ${
                                user.isActive !== false
                                  ? 'bg-red-50 text-red-500 hover:bg-red-100'
                                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                              }`}
                            >
                              {user.isActive !== false ? <Ban className="size-4" /> : <Check className="size-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'verifications' && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <div className="col-span-full py-20 text-center">
                <div className="size-10 border-4 border-teal-500/30 border-t-teal-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-stone-400 font-bold animate-pulse">Fetching documents…</p>
              </div>
            ) : pendingDocs.length === 0 ? (
              <div className="col-span-full bg-white p-16 rounded-[2rem] text-center border-2 border-dashed border-stone-200 flex flex-col items-center">
                <div className="size-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                  <Shield className="size-10 text-emerald-500" />
                </div>
                <h3 className="text-xl font-semibold text-stone-900 mb-2">All Caught Up!</h3>
                <p className="text-stone-500 font-medium max-w-xs mx-auto">No pending document verifications.</p>
              </div>
            ) : (
              pendingDocs.map((doc) => (
                <div key={doc.id} className="bg-white rounded-[2rem] border border-stone-100 shadow-xl shadow-stone-200/50 p-6 hover:-translate-y-1 transition-transform duration-300">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                        <FileText className="size-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-stone-900 leading-tight">{doc.type?.replace('_', ' ') || 'Unknown'}</h3>
                        <p className="text-xs font-bold text-stone-400 mt-1 uppercase tracking-wide">
                          BY: {doc.user?.name || doc.user?.firstName || 'Unknown User'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6 p-4 bg-stone-50 rounded-2xl border border-stone-100 group cursor-pointer hover:border-teal-200 transition-colors">
                    <a
                      href={doc.url && /^https?:\/\//.test(doc.url) ? doc.url : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3"
                      onClick={(e) => {
                        if (!doc.url || !/^https?:\/\//.test(doc.url)) {
                          e.preventDefault();
                          toast.error('Invalid document URL');
                        }
                      }}
                    >
                      <FileText className="size-5 text-stone-400" />
                      <span className="text-sm font-medium text-stone-600 truncate">{doc.url || 'No URL'}</span>
                    </a>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => void handleVerify(doc.id, 'VERIFIED')}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl transition-colors"
                    >
                      <Check className="size-4" /> Approve
                    </button>
                    <button
                      onClick={() => void handleVerify(doc.id, 'REJECTED')}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-bold rounded-xl transition-colors"
                    >
                      <X className="size-4" /> Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
