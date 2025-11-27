'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useInstall } from '@/components/InstallPrompt';

interface Asset {
  asset_id: string;
  asset_name: string;
  qr_code_id: string;
  description: string | null;
  purchase_cost: string | null;
  current_status: string;
  current_location: string | null;
  last_checkout_time: string | null;
  category: string;
  checked_out_by_name: string | null;
  checked_out_by_email: string | null;
}

const CATEGORIES = [
  'Uncategorized',
  'Generators',
  'Power Tools',
  'Hand Tools',
  'Ladders',
  'Safety Equipment',
  'Vehicles',
  'Surveying',
  'Lighting',
  'Other',
];

interface Summary {
  total: number;
  available: number;
  checked_out: number;
  maintenance: number;
  retired: number;
}

interface LogEntry {
  log_id: string;
  action_type: string;
  timestamp: string;
  job_site_name: string | null;
  notes: string | null;
  user_name: string;
}

interface ActivityLog {
  log_id: string;
  action_type: string;
  timestamp: string;
  job_site_name: string | null;
  notes: string | null;
  user_name: string;
  user_email: string;
  asset_id: string;
  asset_name: string;
  qr_code_id: string;
}

interface User {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

type StatusFilter = 'ALL' | 'AVAILABLE' | 'CHECKED_OUT' | 'MAINTENANCE';
type ModalType = 'none' | 'add' | 'edit' | 'history' | 'print' | 'addUser' | 'editUser';
type TabType = 'assets' | 'activity' | 'team';

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  AVAILABLE: { bg: 'bg-green-900/30', text: 'text-green-400', dot: 'bg-green-500' },
  CHECKED_OUT: { bg: 'bg-orange-900/30', text: 'text-orange-400', dot: 'bg-orange-500' },
  MAINTENANCE: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', dot: 'bg-yellow-500' },
  RETIRED: { bg: 'bg-gray-800', text: 'text-gray-400', dot: 'bg-gray-500' },
};

const emptyAssetForm = {
  asset_name: '',
  qr_code_id: '',
  description: '',
  purchase_cost: '',
  current_location: '',
  current_status: 'AVAILABLE',
  category: 'Uncategorized',
};

const emptyUserForm = {
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  phone: '',
  role: 'worker',
};

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { canInstall, isInstalled, triggerInstall } = useInstall();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('assets');

  // Activity state
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityFilter, setActivityFilter] = useState<'ALL' | 'CHECK_OUT' | 'CHECK_IN'>('ALL');

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [userFormLoading, setUserFormLoading] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Modal states
  const [modalType, setModalType] = useState<ModalType>('none');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [assetHistory, setAssetHistory] = useState<LogEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form state
  const [assetForm, setAssetForm] = useState(emptyAssetForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Print selection
  const [selectedForPrint, setSelectedForPrint] = useState<Set<string>>(new Set());

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/assets?${params}`);
      const data = await response.json();

      if (data.success) {
        setAssets(data.data.assets);
        setSummary(data.data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const fetchActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (activityFilter !== 'ALL') {
        params.set('action', activityFilter);
      }

      const response = await fetch(`/api/activity?${params}`);
      const data = await response.json();

      if (data.success) {
        setActivityLogs(data.data.logs);
      }
    } catch (error) {
      console.error('Failed to fetch activity:', error);
    } finally {
      setActivityLoading(false);
    }
  }, [activityFilter]);

  useEffect(() => {
    if (activeTab === 'activity') {
      fetchActivity();
    }
  }, [activeTab, fetchActivity]);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'team' && session?.user?.role === 'manager') {
      fetchUsers();
    }
  }, [activeTab, session?.user?.role, fetchUsers]);

  const fetchAssetHistory = async (asset: Asset) => {
    setSelectedAsset(asset);
    setModalType('history');
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/assets/${asset.asset_id}/history`);
      const data = await response.json();
      if (data.success) {
        setAssetHistory(data.data.logs);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openAddModal = () => {
    setAssetForm(emptyAssetForm);
    setFormError(null);
    setModalType('add');
  };

  const openEditModal = (asset: Asset) => {
    setSelectedAsset(asset);
    setAssetForm({
      asset_name: asset.asset_name,
      qr_code_id: asset.qr_code_id,
      description: asset.description || '',
      purchase_cost: asset.purchase_cost || '',
      current_location: asset.current_location || '',
      current_status: asset.current_status,
      category: asset.category || 'Uncategorized',
    });
    setFormError(null);
    setModalType('edit');
  };

  const closeModal = () => {
    setModalType('none');
    setSelectedAsset(null);
    setSelectedUser(null);
    setAssetHistory([]);
    setFormError(null);
    setUserFormError(null);
  };

  // User modal functions
  const openAddUserModal = () => {
    setUserForm(emptyUserForm);
    setUserFormError(null);
    setModalType('addUser');
  };

  const openEditUserModal = (user: User) => {
    setSelectedUser(user);
    setUserForm({
      email: user.email,
      password: '',
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone || '',
      role: user.role,
    });
    setUserFormError(null);
    setModalType('editUser');
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormLoading(true);
    setUserFormError(null);

    try {
      const isEdit = modalType === 'editUser';
      const url = isEdit ? `/api/users/${selectedUser?.user_id}` : '/api/users';
      const method = isEdit ? 'PUT' : 'POST';

      const body: Record<string, string> = {
        first_name: userForm.first_name,
        last_name: userForm.last_name,
        phone: userForm.phone || '',
        role: userForm.role,
      };

      if (!isEdit) {
        body.email = userForm.email;
        body.password = userForm.password;
      } else if (userForm.password) {
        body.password = userForm.password;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!data.success) {
        setUserFormError(data.error || 'Failed to save user');
        return;
      }

      closeModal();
      fetchUsers();
    } catch {
      setUserFormError('Network error. Please try again.');
    } finally {
      setUserFormLoading(false);
    }
  };

  const handleToggleUserActive = async (user: User) => {
    const action = user.is_active ? 'deactivate' : 'reactivate';
    if (!confirm(`Are you sure you want to ${action} ${user.first_name} ${user.last_name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${user.user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: user.first_name,
          last_name: user.last_name,
          is_active: !user.is_active,
        }),
      });

      const data = await response.json();

      if (data.success) {
        fetchUsers();
      } else {
        alert(data.error || `Failed to ${action} user`);
      }
    } catch {
      alert('Network error. Please try again.');
    }
  };

  const handleSubmitAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      const isEdit = modalType === 'edit';
      const url = isEdit ? `/api/assets/${selectedAsset?.asset_id}` : '/api/assets';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_name: assetForm.asset_name,
          qr_code_id: assetForm.qr_code_id,
          description: assetForm.description || null,
          purchase_cost: assetForm.purchase_cost ? parseFloat(assetForm.purchase_cost) : null,
          current_location: assetForm.current_location || null,
          current_status: isEdit ? assetForm.current_status : undefined,
          category: assetForm.category,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setFormError(data.error || 'Failed to save asset');
        return;
      }

      closeModal();
      fetchAssets();
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteAsset = async (asset: Asset) => {
    if (!confirm(`Are you sure you want to delete "${asset.asset_name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/assets/${asset.asset_id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        fetchAssets();
      } else {
        alert(data.error || 'Failed to delete asset');
      }
    } catch {
      alert('Network error. Please try again.');
    }
  };

  const togglePrintSelection = (assetId: string) => {
    const newSelection = new Set(selectedForPrint);
    if (newSelection.has(assetId)) {
      newSelection.delete(assetId);
    } else {
      newSelection.add(assetId);
    }
    setSelectedForPrint(newSelection);
  };

  const selectAllForPrint = () => {
    if (selectedForPrint.size === assets.length) {
      setSelectedForPrint(new Set());
    } else {
      setSelectedForPrint(new Set(assets.map(a => a.asset_id)));
    }
  };

  const openPrintModal = () => {
    if (selectedForPrint.size === 0) {
      alert('Please select at least one asset to print');
      return;
    }
    setModalType('print');
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const assetsToPrint = assets.filter(a => selectedForPrint.has(a.asset_id));
  const isManager = session?.user?.role === 'manager';

  // Calculate overdue assets (checked out for more than 7 days)
  const OVERDUE_DAYS = 7;
  const overdueAssets = assets.filter(asset => {
    if (asset.current_status !== 'CHECKED_OUT' || !asset.last_checkout_time) return false;
    const checkoutDate = new Date(asset.last_checkout_time);
    const daysSinceCheckout = Math.floor((Date.now() - checkoutDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceCheckout >= OVERDUE_DAYS;
  });

  const getDaysOverdue = (checkoutTime: string) => {
    const checkoutDate = new Date(checkoutTime);
    return Math.floor((Date.now() - checkoutDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Show loading while checking auth
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur border-b border-gray-800 print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-yellow-400">Site</span>Tally
            </h1>
            <span className="text-xs bg-blue-600 px-2 py-1 rounded font-medium">Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            {canInstall && !isInstalled && (
              <button
                onClick={triggerInstall}
                className="text-sm text-yellow-400 hover:text-yellow-300 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Install App
              </button>
            )}
            <Link
              href="/"
              className="text-sm text-gray-400 hover:text-white flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h2m10 0a8 8 0 11-16 0 8 8 0 0116 0z" />
              </svg>
              Scan Mode
            </Link>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="hidden sm:inline">{session.user?.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                session.user?.role === 'manager'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}>
                {session.user?.role === 'manager' ? 'Manager' : 'Worker'}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 print:hidden">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <p className="text-gray-400 text-sm">Total Assets</p>
              <p className="text-3xl font-bold">{summary.total}</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 border border-green-800">
              <p className="text-green-400 text-sm">Available</p>
              <p className="text-3xl font-bold text-green-400">{summary.available}</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 border border-orange-800">
              <p className="text-orange-400 text-sm">Checked Out</p>
              <p className="text-3xl font-bold text-orange-400">{summary.checked_out}</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 border border-yellow-800">
              <p className="text-yellow-400 text-sm">Maintenance</p>
              <p className="text-3xl font-bold text-yellow-400">{summary.maintenance}</p>
            </div>
          </div>
        )}

        {/* Overdue Alert */}
        {overdueAssets.length > 0 && (
          <div className="mb-6 bg-red-900/30 border border-red-500/50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-red-400">
                  {overdueAssets.length} Overdue Item{overdueAssets.length !== 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  Equipment checked out for more than {OVERDUE_DAYS} days
                </p>
                <div className="mt-3 space-y-2">
                  {overdueAssets.slice(0, 3).map(asset => (
                    <div key={asset.asset_id} className="flex items-center justify-between bg-red-900/20 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-white">{asset.asset_name}</p>
                        <p className="text-xs text-gray-400">
                          {asset.checked_out_by_name} • {asset.current_location}
                        </p>
                      </div>
                      <span className="text-xs bg-red-500/30 text-red-300 px-2 py-1 rounded">
                        {getDaysOverdue(asset.last_checkout_time!)} days
                      </span>
                    </div>
                  ))}
                  {overdueAssets.length > 3 && (
                    <p className="text-xs text-gray-500 text-center pt-1">
                      +{overdueAssets.length - 3} more overdue items
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-800 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('assets')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'assets'
                ? 'bg-yellow-500 text-black'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            Assets
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'activity'
                ? 'bg-yellow-500 text-black'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            Activity
          </button>
          {isManager && (
            <button
              onClick={() => setActiveTab('team')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'team'
                  ? 'bg-yellow-500 text-black'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Team
            </button>
          )}
        </div>

        {/* Assets Tab Content */}
        {activeTab === 'assets' && (
          <>
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by name or QR code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {(['ALL', 'AVAILABLE', 'CHECKED_OUT', 'MAINTENANCE'] as StatusFilter[]).map((filterStatus) => (
                  <button
                    key={filterStatus}
                    onClick={() => setStatusFilter(filterStatus)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      statusFilter === filterStatus
                        ? 'bg-yellow-500 text-black'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {filterStatus === 'ALL' ? 'All' : filterStatus === 'CHECKED_OUT' ? 'Out' : filterStatus.charAt(0) + filterStatus.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          {isManager ? (
            <>
              <button
                onClick={openAddModal}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Asset
              </button>
              <button
                onClick={openPrintModal}
                disabled={selectedForPrint.size === 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print QR Labels ({selectedForPrint.size})
              </button>
            </>
          ) : (
            <div className="px-4 py-2 bg-gray-800 text-gray-400 rounded-lg text-sm">
              View only - Contact a manager to add or modify assets
            </div>
          )}
        </div>

        {/* Assets Table */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p>No assets found</p>
              {isManager && (
                <button onClick={openAddModal} className="mt-4 text-yellow-400 hover:underline">
                  Add your first asset
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700 text-left">
                    {isManager && (
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedForPrint.size === assets.length && assets.length > 0}
                          onChange={selectAllForPrint}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-yellow-500 focus:ring-yellow-500"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 text-sm font-medium text-gray-400">Asset</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-400">QR Code</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-400">Status</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-400 hidden md:table-cell">Location</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-400 hidden lg:table-cell">Held By</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => {
                    const colors = statusColors[asset.current_status] || statusColors.RETIRED;
                    return (
                      <tr
                        key={asset.asset_id}
                        className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                      >
                        {isManager && (
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedForPrint.has(asset.asset_id)}
                              onChange={() => togglePrintSelection(asset.asset_id)}
                              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-yellow-500 focus:ring-yellow-500"
                            />
                          </td>
                        )}
                        <td className="px-4 py-4">
                          <p className="font-medium text-white">{asset.asset_name}</p>
                          <p className="text-xs text-blue-400">{asset.category}</p>
                          {asset.description && (
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{asset.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <code className="text-sm text-gray-300 bg-gray-900 px-2 py-1 rounded">
                            {asset.qr_code_id}
                          </code>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${colors.bg} ${colors.text}`}>
                            <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                            {asset.current_status === 'CHECKED_OUT' ? 'Out' : asset.current_status.charAt(0) + asset.current_status.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell text-gray-300">
                          {asset.current_location || '-'}
                        </td>
                        <td className="px-4 py-4 hidden lg:table-cell">
                          {asset.checked_out_by_name ? (
                            <p className="text-white">{asset.checked_out_by_name}</p>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => fetchAssetHistory(asset)}
                              className="text-blue-400 hover:text-blue-300 text-sm"
                              title="View History"
                            >
                              History
                            </button>
                            {isManager && (
                              <>
                                <button
                                  onClick={() => openEditModal(asset)}
                                  className="text-gray-400 hover:text-white text-sm"
                                  title="Edit"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteAsset(asset)}
                                  className="text-red-400 hover:text-red-300 text-sm"
                                  title="Delete"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
          </>
        )}

        {/* Activity Tab Content */}
        {activeTab === 'activity' && (
          <>
            {/* Activity Filter */}
            <div className="flex gap-2 mb-6">
              {(['ALL', 'CHECK_OUT', 'CHECK_IN'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActivityFilter(filter)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activityFilter === filter
                      ? 'bg-yellow-500 text-black'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {filter === 'ALL' ? 'All Activity' : filter === 'CHECK_OUT' ? 'Check Outs' : 'Check Ins'}
                </button>
              ))}
            </div>

            {/* Activity List */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              {activityLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : activityLogs.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <p>No activity recorded yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-700">
                  {activityLogs.map((log) => (
                    <div
                      key={log.log_id}
                      className="p-4 hover:bg-gray-700/30 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          log.action_type === 'CHECK_OUT'
                            ? 'bg-orange-900/50 text-orange-400'
                            : 'bg-green-900/50 text-green-400'
                        }`}>
                          {log.action_type === 'CHECK_OUT' ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-white">
                              <span className={log.action_type === 'CHECK_OUT' ? 'text-orange-400' : 'text-green-400'}>
                                {log.action_type === 'CHECK_OUT' ? 'Checked out' : 'Checked in'}
                              </span>
                              {' '}
                              <span className="text-gray-300">{log.asset_name}</span>
                            </p>
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {formatDate(log.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mt-1">
                            by {log.user_name}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="bg-gray-900 px-2 py-1 rounded font-mono">{log.qr_code_id}</span>
                            {log.job_site_name && (
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {log.job_site_name}
                              </span>
                            )}
                          </div>
                          {log.notes && (
                            <p className="text-xs text-gray-500 mt-2 italic">&quot;{log.notes}&quot;</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Team Tab Content (Managers Only) */}
        {activeTab === 'team' && isManager && (
          <>
            {/* Add User Button */}
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-400">
                {users.filter(u => u.is_active).length} active team members
              </p>
              <button
                onClick={openAddUserModal}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Team Member
              </button>
            </div>

            {/* Users List */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              {usersLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <p>No team members yet</p>
                  <button onClick={openAddUserModal} className="mt-4 text-yellow-400 hover:underline">
                    Add your first team member
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-700">
                  {users.map((user) => (
                    <div
                      key={user.user_id}
                      className={`p-4 hover:bg-gray-700/30 transition-colors ${!user.is_active ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                            user.role === 'manager'
                              ? 'bg-purple-900/50 text-purple-400'
                              : 'bg-blue-900/50 text-blue-400'
                          }`}>
                            {user.first_name[0]}{user.last_name[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-white">
                                {user.first_name} {user.last_name}
                              </p>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                user.role === 'manager'
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-gray-600 text-gray-300'
                              }`}>
                                {user.role === 'manager' ? 'Manager' : 'Worker'}
                              </span>
                              {!user.is_active && (
                                <span className="text-xs px-2 py-0.5 rounded bg-red-900/50 text-red-400">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400">{user.email}</p>
                            {user.phone && (
                              <p className="text-xs text-gray-500">{user.phone}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditUserModal(user)}
                            className="text-gray-400 hover:text-white text-sm px-3 py-1"
                          >
                            Edit
                          </button>
                          {user.user_id !== session?.user?.id && (
                            <button
                              onClick={() => handleToggleUserActive(user)}
                              className={`text-sm px-3 py-1 ${
                                user.is_active
                                  ? 'text-red-400 hover:text-red-300'
                                  : 'text-green-400 hover:text-green-300'
                              }`}
                            >
                              {user.is_active ? 'Deactivate' : 'Reactivate'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Add/Edit Modal */}
      {(modalType === 'add' || modalType === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 print:hidden">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-bold text-lg">
                {modalType === 'add' ? 'Add New Asset' : 'Edit Asset'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-gray-700 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmitAsset} className="p-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Asset Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={assetForm.asset_name}
                  onChange={(e) => setAssetForm({ ...assetForm, asset_name: e.target.value })}
                  placeholder="e.g., Honda 5000W Generator"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  QR Code ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={assetForm.qr_code_id}
                  onChange={(e) => setAssetForm({ ...assetForm, qr_code_id: e.target.value.toUpperCase() })}
                  placeholder="e.g., GEN-001"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white font-mono focus:outline-none focus:border-yellow-500"
                  required
                  disabled={modalType === 'edit'}
                />
                {modalType === 'edit' && (
                  <p className="text-xs text-gray-500 mt-1">QR Code ID cannot be changed</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={assetForm.description}
                  onChange={(e) => setAssetForm({ ...assetForm, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                  <select
                    value={assetForm.category}
                    onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Purchase Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    value={assetForm.purchase_cost}
                    onChange={(e) => setAssetForm({ ...assetForm, purchase_cost: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
                <input
                  type="text"
                  value={assetForm.current_location}
                  onChange={(e) => setAssetForm({ ...assetForm, current_location: e.target.value })}
                  placeholder="e.g., Warehouse"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                />
              </div>

              {modalType === 'edit' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                  <select
                    value={assetForm.current_status}
                    onChange={(e) => setAssetForm({ ...assetForm, current_status: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="CHECKED_OUT">Checked Out</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="RETIRED">Retired</option>
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-medium rounded-lg disabled:opacity-50"
                >
                  {formLoading ? 'Saving...' : modalType === 'add' ? 'Add Asset' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {modalType === 'history' && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 print:hidden">
          <div className="bg-gray-800 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden border border-gray-700">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">{selectedAsset.asset_name}</h3>
                <p className="text-sm text-gray-400">{selectedAsset.qr_code_id}</p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-gray-700 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {historyLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : assetHistory.length === 0 ? (
                <p className="text-center text-gray-400 py-10">No history recorded</p>
              ) : (
                <div className="space-y-4">
                  {assetHistory.map((log) => (
                    <div
                      key={log.log_id}
                      className={`p-3 rounded-lg border ${
                        log.action_type === 'CHECK_OUT'
                          ? 'border-orange-800 bg-orange-900/20'
                          : 'border-green-800 bg-green-900/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${
                          log.action_type === 'CHECK_OUT' ? 'text-orange-400' : 'text-green-400'
                        }`}>
                          {log.action_type === 'CHECK_OUT' ? '→ Checked Out' : '← Checked In'}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(log.timestamp)}</span>
                      </div>
                      <p className="text-sm text-white">{log.user_name}</p>
                      {log.job_site_name && (
                        <p className="text-xs text-gray-400 mt-1">Location: {log.job_site_name}</p>
                      )}
                      {log.notes && (
                        <p className="text-xs text-gray-500 mt-1 italic">&quot;{log.notes}&quot;</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {modalType === 'print' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 print:hidden">
          <div className="bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-700">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-bold text-lg">Print QR Labels ({assetsToPrint.length})</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
                <button onClick={closeModal} className="p-2 hover:bg-gray-700 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh] bg-white">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {assetsToPrint.map((asset) => (
                  <div
                    key={asset.asset_id}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/qrcode?code=${encodeURIComponent(asset.qr_code_id)}&size=150`}
                      alt={`QR code for ${asset.qr_code_id}`}
                      width={150}
                      height={150}
                      className="mb-2"
                    />
                    <p className="font-bold text-black text-center text-sm">{asset.asset_name}</p>
                    <p className="font-mono text-gray-600 text-xs">{asset.qr_code_id}</p>
                    <p className="text-yellow-600 font-bold text-xs mt-1">SiteTally</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit User Modal */}
      {(modalType === 'addUser' || modalType === 'editUser') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 print:hidden">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-bold text-lg">
                {modalType === 'addUser' ? 'Add Team Member' : 'Edit Team Member'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-gray-700 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmitUser} className="p-4 space-y-4">
              {userFormError && (
                <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
                  {userFormError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    First Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={userForm.first_name}
                    onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })}
                    placeholder="John"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Last Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={userForm.last_name}
                    onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })}
                    placeholder="Smith"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="john@company.com"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  required={modalType === 'addUser'}
                  disabled={modalType === 'editUser'}
                />
                {modalType === 'editUser' && (
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Password {modalType === 'addUser' && <span className="text-red-400">*</span>}
                </label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder={modalType === 'editUser' ? 'Leave blank to keep current' : 'Min 6 characters'}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  required={modalType === 'addUser'}
                  minLength={modalType === 'addUser' ? 6 : undefined}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                <input
                  type="tel"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  placeholder="07700 123456"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                >
                  <option value="worker">Worker</option>
                  <option value="manager">Manager</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Managers can add assets, view team, and manage users
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={userFormLoading}
                  className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-medium rounded-lg disabled:opacity-50"
                >
                  {userFormLoading ? 'Saving...' : modalType === 'addUser' ? 'Add Member' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print-only content (hidden on screen, shown when printing) */}
      <div className="hidden print:block">
        <div className="grid grid-cols-3 gap-4 p-4">
          {assetsToPrint.map((asset) => (
            <div
              key={asset.asset_id}
              className="border-2 border-dashed border-gray-400 rounded-lg p-4 flex flex-col items-center page-break-inside-avoid"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/qrcode?code=${encodeURIComponent(asset.qr_code_id)}&size=200`}
                alt={`QR code for ${asset.qr_code_id}`}
                width={200}
                height={200}
                className="mb-2"
              />
              <p className="font-bold text-black text-center">{asset.asset_name}</p>
              <p className="font-mono text-gray-600 text-sm">{asset.qr_code_id}</p>
              <p className="text-yellow-600 font-bold text-xs mt-1">SiteTally</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
