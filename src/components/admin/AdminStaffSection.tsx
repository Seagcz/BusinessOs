import React, { useState } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  KeyRound,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Check,
  X,
  Phone,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Sparkles,
  Lock,
  DollarSign,
  Package,
  FileSpreadsheet,
  Settings,
  Clock,
  Briefcase,
  AlertTriangle,
  Layers,
  ChevronRight,
  Copy,
  CheckCheck,
  RefreshCw,
} from 'lucide-react';
import { StaffUser, StaffRole, CustomRole, StaffPermissions } from '../../types';
import { SYSTEM_ROLE_PRESETS } from '../../services/nigerianData';
import { storageService } from '../../services/storage';

interface AdminStaffSectionProps {
  currentStaff: StaffUser;
  staffList: StaffUser[];
  customRoles?: CustomRole[];
  businessId: string;
  onSaveStaff: (staff: StaffUser) => void;
  onDeleteStaff: (staffId: string) => void;
  onSaveCustomRole?: (role: CustomRole) => void;
  onDeleteCustomRole?: (roleId: string) => void;
  onLogActivity?: (action: string, details: string, entityType: 'staff') => void;
}

const DEFAULT_PERMISSIONS: StaffPermissions = {
  canRecordSales: true,
  canVoidSales: false,
  canDeleteSales: false,
  canApplyDiscounts: false,
  canViewProfit: false,
  canViewCostPrice: false,
  canChangePrices: false,
  canManageInventory: false,
  canDeleteProducts: false,
  canManageExpenses: false,
  canManageDebts: true,
  canManageInvoices: false,
  canViewReports: false,
  canViewFinancialReports: false,
  canExportData: false,
  canManageStaff: false,
  canManageRoles: false,
  canEditSettings: false,
  canManageBackups: false,
  canViewAuditLogs: false,
};

const COLOR_OPTIONS = [
  'bg-emerald-950 text-emerald-300 border-emerald-800',
  'bg-purple-950 text-purple-300 border-purple-800',
  'bg-sky-950 text-sky-300 border-sky-800',
  'bg-amber-950 text-amber-300 border-amber-800',
  'bg-teal-950 text-teal-300 border-teal-800',
  'bg-rose-950 text-rose-300 border-rose-800',
  'bg-indigo-950 text-indigo-300 border-indigo-800',
  'bg-cyan-950 text-cyan-300 border-cyan-800',
];

export const AdminStaffSection: React.FC<AdminStaffSectionProps> = ({
  currentStaff,
  staffList,
  customRoles = [],
  businessId,
  onSaveStaff,
  onDeleteStaff,
  onSaveCustomRole,
  onDeleteCustomRole,
  onLogActivity,
}) => {
  const [activeTab, setActiveTab] = useState<'staff' | 'roles'>('staff');

  // Staff Modal State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);

  // Staff Form Fields
  const [name, setName] = useState('');
  const [role, setRole] = useState<StaffRole>('cashier');
  const [customRoleId, setCustomRoleId] = useState<string>('');
  const [pin, setPin] = useState('0000');
  const [phone, setPhone] = useState('');
  const [avatarColor, setAvatarColor] = useState('bg-sky-600');
  const [isActive, setIsActive] = useState(true);
  const [showPin, setShowPin] = useState(false);

  // Granular Permissions Form State
  const [permissions, setPermissions] = useState<StaffPermissions>(DEFAULT_PERMISSIONS);

  // Custom Role Modal State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [roleBadgeColor, setRoleBadgeColor] = useState(COLOR_OPTIONS[0]);
  const [rolePermissions, setRolePermissions] = useState<StaffPermissions>(DEFAULT_PERMISSIONS);

  const [filterRole, setFilterRole] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const isOwner = currentStaff.role === 'owner';
  const canManageRoles = isOwner || currentStaff.canManageRoles;
  const isOwnerOrAdmin = isOwner || currentStaff.canManageStaff;

  // Admin-Only Separate Employee PIN Provisioning Modal State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinTargetStaff, setPinTargetStaff] = useState<StaffUser | null>(null);
  const [provisionPin, setProvisionPin] = useState('');
  const [provisionMustChange, setProvisionMustChange] = useState(true);
  const [provisionPassword, setProvisionPassword] = useState('');
  const [pinCopied, setPinCopied] = useState(false);
  const [pinSuccessMsg, setPinSuccessMsg] = useState('');
  const [pinErrorMsg, setPinErrorMsg] = useState('');

  const handleOpenPinProvisioning = (target: StaffUser) => {
    if (!isOwnerOrAdmin) {
      alert('Access Denied: Only store owners and authorized administrators can set or reset employee PINs.');
      return;
    }
    setPinTargetStaff(target);
    setProvisionPin(Math.floor(1000 + Math.random() * 9000).toString());
    setProvisionMustChange(target.role !== 'owner');
    setProvisionPassword(target.password || '');
    setPinSuccessMsg('');
    setPinErrorMsg('');
    setPinCopied(false);
    setIsPinModalOpen(true);
  };

  const handleSaveProvisionedPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinTargetStaff) return;
    if (!isOwnerOrAdmin) {
      setPinErrorMsg('Access Denied: Only administrators can create separate PINs for employees.');
      return;
    }
    if (!provisionPin || provisionPin.length !== 4 || !/^\d{4}$/.test(provisionPin)) {
      setPinErrorMsg('Please provide a valid 4-digit numeric PIN.');
      return;
    }

    const result = storageService.adminProvisionEmployeePin(
      currentStaff,
      pinTargetStaff.id,
      provisionPin,
      provisionPassword || undefined,
      provisionMustChange
    );

    if (!result.success) {
      setPinErrorMsg(result.message || 'Failed to update employee PIN');
      return;
    }

    const updated = result.employee || {
      ...pinTargetStaff,
      pin: provisionPin,
      password: provisionPassword || pinTargetStaff.password,
      mustChangePinOnNextLogin: provisionMustChange,
      hasCreatedCredentials: true,
    };
    onSaveStaff(updated);

    if (onLogActivity) {
      onLogActivity(
        'Employee PIN Provisioned',
        `Admin "${currentStaff.name}" created/updated separate PIN for employee "${pinTargetStaff.name}" (${pinTargetStaff.role}).`,
        'staff'
      );
    }

    setPinSuccessMsg(`PIN successfully provisioned for ${pinTargetStaff.name}!`);
    setTimeout(() => {
      setIsPinModalOpen(false);
      setPinSuccessMsg('');
    }, 1200);
  };

  const handleCopyPinSlip = () => {
    if (!pinTargetStaff) return;
    const slip = `🔐 Business OS — Employee Credentials Slip\n👤 Staff: ${pinTargetStaff.name} (${pinTargetStaff.role.toUpperCase()})\n🔢 4-Digit Login PIN: ${provisionPin}\n${provisionPassword ? `🔑 Master Password: ${provisionPassword}\n` : ''}${provisionMustChange ? '⚠️ Notice: You will be asked to choose your own private 4-digit PIN on your first login.\n' : ''}🛡️ Provisioned by Admin: ${currentStaff.name}`;
    navigator.clipboard.writeText(slip);
    setPinCopied(true);
    setTimeout(() => setPinCopied(false), 2500);
  };

  // Fallback custom roles from storage
  const effectiveCustomRoles = customRoles.length > 0 ? customRoles : storageService.getCustomRoles(businessId);

  // Combined roles list for dropdowns
  const allRoleOptions = [
    { id: 'owner', name: 'Owner / Director (System)', isCustom: false },
    { id: 'manager', name: 'Store Manager (System)', isCustom: false },
    { id: 'cashier', name: 'Sales Cashier (System)', isCustom: false },
    { id: 'inventory_manager', name: 'Inventory Manager (System)', isCustom: false },
    { id: 'accountant', name: 'Financial Accountant (System)', isCustom: false },
    ...effectiveCustomRoles.map((r) => ({ id: r.id, name: `${r.name} (Custom Role)`, isCustom: true })),
  ];

  // Open Add Staff Modal
  const handleOpenAddStaff = () => {
    if (!isOwnerOrAdmin) {
      alert('Access Denied: Only store owners and authorized administrators can create new staff accounts.');
      return;
    }
    setEditingStaff(null);
    setName('');
    setRole('cashier');
    setCustomRoleId('');
    setPin(Math.floor(1000 + Math.random() * 9000).toString());
    setPhone('');
    setAvatarColor('bg-sky-600');
    setIsActive(true);
    setPermissions({ ...SYSTEM_ROLE_PRESETS.cashier.permissions });
    setIsStaffModalOpen(true);
  };

  // Open Edit Staff Modal
  const handleOpenEditStaff = (staff: StaffUser) => {
    setEditingStaff(staff);
    setName(staff.name);
    setRole(staff.role);
    setCustomRoleId(staff.customRoleId || '');
    setPin(staff.pin || '1234');
    setPhone(staff.phone || '');
    setAvatarColor(staff.avatarColor || 'bg-slate-700');
    setIsActive(staff.isActive !== false);

    // Populate current permissions
    setPermissions({
      canRecordSales: staff.canRecordSales ?? true,
      canVoidSales: staff.canVoidSales ?? false,
      canDeleteSales: staff.canDeleteSales ?? false,
      canApplyDiscounts: staff.canApplyDiscounts ?? false,
      canViewProfit: staff.canViewProfit ?? false,
      canViewCostPrice: staff.canViewCostPrice ?? false,
      canChangePrices: staff.canChangePrices ?? false,
      canManageInventory: staff.canManageInventory ?? false,
      canDeleteProducts: staff.canDeleteProducts ?? false,
      canManageExpenses: staff.canManageExpenses ?? false,
      canManageDebts: staff.canManageDebts ?? true,
      canManageInvoices: staff.canManageInvoices ?? false,
      canViewReports: staff.canViewReports ?? false,
      canViewFinancialReports: staff.canViewFinancialReports ?? false,
      canExportData: staff.canExportData ?? false,
      canManageStaff: staff.canManageStaff ?? false,
      canManageRoles: staff.canManageRoles ?? false,
      canEditSettings: staff.canEditSettings ?? false,
      canManageBackups: staff.canManageBackups ?? false,
      canViewAuditLogs: staff.canViewAuditLogs ?? false,
    });
    setIsStaffModalOpen(true);
  };

  // Apply Role Preset to Staff Permissions
  const handleApplyRoleSelection = (selectedRoleKey: string) => {
    const customMatch = effectiveCustomRoles.find((r) => r.id === selectedRoleKey);
    if (customMatch) {
      setRole('custom');
      setCustomRoleId(customMatch.id);
      setPermissions({ ...customMatch.permissions });
      setAvatarColor('bg-indigo-600');
    } else if (SYSTEM_ROLE_PRESETS[selectedRoleKey]) {
      setRole(selectedRoleKey as StaffRole);
      setCustomRoleId('');
      setPermissions({ ...SYSTEM_ROLE_PRESETS[selectedRoleKey].permissions });
      if (selectedRoleKey === 'owner') setAvatarColor('bg-emerald-600');
      else if (selectedRoleKey === 'manager') setAvatarColor('bg-purple-600');
      else if (selectedRoleKey === 'cashier') setAvatarColor('bg-sky-600');
      else if (selectedRoleKey === 'inventory_manager') setAvatarColor('bg-amber-600');
      else if (selectedRoleKey === 'accountant') setAvatarColor('bg-teal-600');
    }
  };

  // Save Staff Submit
  const handleSaveStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter the staff member name.');
      return;
    }
    if (!pin || pin.length < 4) {
      alert('Please provide a 4-digit numeric login PIN.');
      return;
    }

    const customObj = role === 'custom' ? effectiveCustomRoles.find((r) => r.id === customRoleId) : undefined;

    const staffObj: StaffUser = {
      id: editingStaff ? editingStaff.id : 'staff_' + Date.now(),
      businessId,
      name: name.trim(),
      role,
      customRoleId: role === 'custom' ? customRoleId : undefined,
      customRoleName: customObj ? customObj.name : undefined,
      pin: pin.trim(),
      phone: phone.trim() || undefined,
      avatarColor,
      isActive,
      ...permissions,
      createdAt: editingStaff ? editingStaff.createdAt : new Date().toISOString(),
    };

    onSaveStaff(staffObj);

    if (onLogActivity) {
      onLogActivity(
        editingStaff ? 'Staff Updated' : 'Staff Created',
        `Staff "${staffObj.name}" (${staffObj.role}) credentials & permissions configured.`,
        'staff'
      );
    }

    setIsStaffModalOpen(false);
  };

  // Delete Staff
  const handleDeleteStaffClick = (staff: StaffUser) => {
    if (staff.id === currentStaff.id) {
      alert('You cannot delete your own active staff account.');
      return;
    }
    if (staff.role === 'owner' && staffList.filter((s) => s.role === 'owner').length <= 1) {
      alert('Cannot delete the primary Store Owner account.');
      return;
    }
    if (confirm(`Are you sure you want to remove ${staff.name} from the staff registry?`)) {
      onDeleteStaff(staff.id);
      if (onLogActivity) {
        onLogActivity('Staff Deleted', `Staff member ${staff.name} (${staff.role}) was deleted.`, 'staff');
      }
    }
  };

  // Custom Role Actions
  const handleOpenAddRole = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDescription('');
    setRoleBadgeColor(COLOR_OPTIONS[6]);
    setRolePermissions({ ...DEFAULT_PERMISSIONS });
    setIsRoleModalOpen(true);
  };

  const handleOpenEditRole = (custRole: CustomRole) => {
    setEditingRole(custRole);
    setRoleName(custRole.name);
    setRoleDescription(custRole.description);
    setRoleBadgeColor(custRole.badgeColor || COLOR_OPTIONS[6]);
    setRolePermissions({ ...custRole.permissions });
    setIsRoleModalOpen(true);
  };

  const handleSaveRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      alert('Please enter a role name.');
      return;
    }

    const roleObj: CustomRole = {
      id: editingRole ? editingRole.id : 'role_' + Date.now(),
      businessId,
      name: roleName.trim(),
      description: roleDescription.trim() || 'Customized staff role with designated granular permissions.',
      badgeColor: roleBadgeColor,
      permissions: { ...rolePermissions },
      createdAt: editingRole ? editingRole.createdAt : new Date().toISOString(),
    };

    if (onSaveCustomRole) {
      onSaveCustomRole(roleObj);
    } else {
      storageService.saveCustomRole(roleObj, currentStaff.name);
    }

    setIsRoleModalOpen(false);
  };

  const handleDeleteRoleClick = (roleId: string, rName: string) => {
    const assignedCount = staffList.filter((s) => s.customRoleId === roleId).length;
    if (assignedCount > 0) {
      alert(`Cannot delete "${rName}" because ${assignedCount} staff member(s) are currently assigned to it.`);
      return;
    }
    if (confirm(`Delete custom role "${rName}"? This action cannot be undone.`)) {
      if (onDeleteCustomRole) {
        onDeleteCustomRole(roleId);
      } else {
        storageService.deleteCustomRole(roleId, currentStaff.name, businessId);
      }
    }
  };

  // Filtered staff list
  const filteredStaff = staffList.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.phone && s.phone.includes(searchQuery));
    const matchRole =
      filterRole === 'all' ||
      s.role === filterRole ||
      (filterRole === 'custom' && s.role === 'custom') ||
      s.customRoleId === filterRole;
    return matchSearch && matchRole;
  });

  // Permission Toggle Helper
  const togglePermission = (key: keyof StaffPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleRolePermission = (key: keyof StaffPermissions) => {
    setRolePermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const getRoleBadge = (staff: StaffUser) => {
    if (staff.role === 'custom') {
      const customObj = effectiveCustomRoles.find((r) => r.id === staff.customRoleId);
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
            customObj?.badgeColor || 'bg-indigo-950 text-indigo-300 border-indigo-800'
          }`}
        >
          <Sparkles className="w-3 h-3" />
          <span>{customObj?.name || staff.customRoleName || 'Custom Role'}</span>
        </span>
      );
    }
    const preset = SYSTEM_ROLE_PRESETS[staff.role] || SYSTEM_ROLE_PRESETS.cashier;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${preset.badgeColor}`}>
        <ShieldCheck className="w-3 h-3" />
        <span>{preset.title.split('/')[0].trim()}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Staff, Roles & Permissions</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure employee accounts, 4-digit PINs, granular capability restrictions, and custom roles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManageRoles && (
            <button
              onClick={handleOpenAddRole}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-800/60 rounded-2xl text-xs sm:text-sm font-semibold transition active:scale-95 cursor-pointer shadow-md"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>New Custom Role</span>
            </button>
          )}

          <button
            onClick={handleOpenAddStaff}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-purple-950 transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 gap-1.5">
        <button
          onClick={() => setActiveTab('staff')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'staff'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Directory ({staffList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'roles'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Roles & Security Matrix ({5 + effectiveCustomRoles.length})</span>
        </button>
      </div>

      {/* TAB 1: STAFF DIRECTORY */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          {/* Admin Security Banner */}
          <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-xs sm:text-sm">Admin-Only Employee PIN Provisioning</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Only store owners and authorized admins can create separate PINs for employees. Cashiers and staff use their dedicated 4-digit PINs at POS checkout.
                </p>
              </div>
            </div>
            {isOwnerOrAdmin && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenAddStaff}
                  className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Staff Member</span>
                </button>
              </div>
            )}
          </div>

          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search staff name, phone number or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-2xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Roles ({staffList.length})</option>
                <option value="owner">Owners</option>
                <option value="manager">Managers</option>
                <option value="cashier">Cashiers</option>
                <option value="inventory_manager">Inventory Managers</option>
                <option value="accountant">Accountants</option>
                {effectiveCustomRoles.map((cr) => (
                  <option key={cr.id} value={cr.id}>
                    {cr.name} (Custom)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Staff Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStaff.map((staff) => {
              const isCurrentUser = staff.id === currentStaff.id;

              return (
                <div
                  key={staff.id}
                  className={`bg-slate-900/80 border rounded-3xl p-5 space-y-4 shadow-lg transition hover:border-slate-700 ${
                    staff.isActive === false
                      ? 'opacity-60 border-slate-800'
                      : isCurrentUser
                      ? 'border-purple-500/60 ring-1 ring-purple-500/30'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl ${
                          staff.avatarColor || 'bg-slate-700'
                        } flex items-center justify-center font-bold text-white text-lg shadow-md`}
                      >
                        {staff.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-base">{staff.name}</h3>
                          {isCurrentUser && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                              You
                            </span>
                          )}
                        </div>
                        <div className="mt-1">{getRoleBadge(staff)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditStaff(staff)}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                        title="Edit staff details & permissions"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStaffClick(staff)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                        title="Delete staff account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Staff Info & Security Pills */}
                  <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800/80 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Counter PIN:</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-100 tracking-widest bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                          {isOwner || isCurrentUser ? staff.pin : '••••'}
                        </span>
                        {isOwnerOrAdmin && (
                          <button
                            type="button"
                            onClick={() => handleOpenPinProvisioning(staff)}
                            className="px-2 py-0.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer active:scale-95"
                            title="Admin-only: Set or reset employee PIN"
                          >
                            <KeyRound className="w-2.5 h-2.5" />
                            <span>{staff.role === 'owner' ? 'Reset PIN' : 'Set PIN'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {staff.mustChangePinOnNextLogin && (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-amber-950/50 border border-amber-800/60 text-amber-300 text-[10px] font-semibold">
                        <Sparkles className="w-3 h-3 flex-shrink-0 text-amber-400" />
                        <span>Temporary PIN: Change required on 1st login</span>
                      </div>
                    )}

                    {staff.phone && (
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>Phone:</span>
                        </span>
                        <span className="text-slate-300">{staff.phone}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-slate-400">
                      <span>Account Status:</span>
                      <span
                        className={`font-bold ${
                          staff.isActive !== false ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {staff.isActive !== false ? 'Active & Ready' : 'Suspended'}
                      </span>
                    </div>
                  </div>

                  {/* Key Capabilities Badges */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-400 block">
                      Granted Security Capabilities:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {staff.canRecordSales && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-800 text-slate-300">
                          ✓ POS Sales
                        </span>
                      )}
                      {staff.canVoidSales && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] bg-purple-950/60 text-purple-300 border border-purple-800/40">
                          ✓ Void Orders
                        </span>
                      )}
                      {staff.canDeleteSales && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] bg-rose-950/60 text-rose-300 border border-rose-800/40">
                          🚨 Delete Sales
                        </span>
                      )}
                      {staff.canViewProfit && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                          🔒 Profit Margins
                        </span>
                      )}
                      {staff.canViewCostPrice && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] bg-teal-950/60 text-teal-300 border border-teal-800/40">
                          🔒 Cost Prices
                        </span>
                      )}
                      {staff.canChangePrices && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] bg-amber-950/60 text-amber-300 border border-amber-800/40">
                          🔒 Edit Prices
                        </span>
                      )}
                      {staff.canManageInventory && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-800 text-slate-300">
                          ✓ Inventory
                        </span>
                      )}
                      {staff.canManageExpenses && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-800 text-slate-300">
                          ✓ Expenses
                        </span>
                      )}
                      {staff.canViewReports && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-800 text-slate-300">
                          ✓ Reports
                        </span>
                      )}
                      {staff.canManageStaff && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] bg-purple-950/60 text-purple-300 border border-purple-800/40">
                          ✓ Staff Admin
                        </span>
                      )}
                      {staff.canEditSettings && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-800 text-slate-300">
                          ✓ Settings
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: ROLES & SECURITY MATRIX (PRESETS + CUSTOM ROLES) */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          {/* Presets Header Notice */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs sm:text-sm text-slate-300 space-y-1">
              <p className="font-bold text-white">System Role Architecture & Custom Role Creator</p>
              <p className="text-slate-400">
                The business supports 5 standard operational roles (Owner, Manager, Cashier, Inventory Manager, Accountant). As an Owner, you can create custom roles with tailored permissions for specialized staff like supervisors, dispatchers, or storekeepers.
              </p>
            </div>
          </div>

          {/* System Presets Grid */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              System Preset Roles
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.values(SYSTEM_ROLE_PRESETS).map((preset) => {
                const assignedCount = staffList.filter((s) => s.role === preset.roleId).length;

                return (
                  <div
                    key={preset.roleId}
                    className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${preset.badgeColor}`}>
                          {preset.title}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">
                          {assignedCount} Assigned
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Security Safeguards:
                      </span>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        <div className="flex items-center gap-1 text-slate-300">
                          {preset.permissions.canViewProfit ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-rose-500" />
                          )}
                          <span>View Profits</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-300">
                          {preset.permissions.canChangePrices ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-rose-500" />
                          )}
                          <span>Change Prices</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-300">
                          {preset.permissions.canVoidSales ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-rose-500" />
                          )}
                          <span>Void Orders</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-300">
                          {preset.permissions.canDeleteSales ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-rose-500" />
                          )}
                          <span>Delete Sales</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Roles Section */}
          <div className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                  Owner Custom Roles ({effectiveCustomRoles.length})
                </h3>
              </div>

              {canManageRoles && (
                <button
                  onClick={handleOpenAddRole}
                  className="flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Role</span>
                </button>
              )}
            </div>

            {effectiveCustomRoles.length === 0 ? (
              <div className="p-8 bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl text-center space-y-3">
                <Briefcase className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-sm">No Custom Roles Created Yet</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Store Owners can configure custom roles like "Shift Supervisor", "Delivery Driver", or "Inventory Auditor".
                  </p>
                </div>
                {canManageRoles && (
                  <button
                    onClick={handleOpenAddRole}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md transition"
                  >
                    + Create First Custom Role
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {effectiveCustomRoles.map((cr) => {
                  const assignedCount = staffList.filter((s) => s.customRoleId === cr.id).length;

                  return (
                    <div
                      key={cr.id}
                      className="bg-slate-900/90 border border-purple-900/40 rounded-3xl p-5 space-y-4 shadow-lg flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                              cr.badgeColor || 'bg-indigo-950 text-indigo-300 border-indigo-800'
                            }`}
                          >
                            {cr.name}
                          </span>

                          <div className="flex items-center gap-1">
                            {canManageRoles && (
                              <>
                                <button
                                  onClick={() => handleOpenEditRole(cr)}
                                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                                  title="Edit custom role"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteRoleClick(cr.id, cr.name)}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                                  title="Delete custom role"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">{cr.description}</p>
                        <span className="text-[11px] text-purple-400 font-semibold block mt-2">
                          {assignedCount} Staff Assigned
                        </span>
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 space-y-1.5 text-[11px]">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Permissions Summary:
                        </span>
                        <div className="grid grid-cols-2 gap-1 text-slate-300">
                          <span className={cr.permissions.canRecordSales ? 'text-emerald-400' : 'text-slate-500'}>
                            {cr.permissions.canRecordSales ? '✓ Sales POS' : '✗ No Sales'}
                          </span>
                          <span className={cr.permissions.canVoidSales ? 'text-emerald-400' : 'text-slate-500'}>
                            {cr.permissions.canVoidSales ? '✓ Void Orders' : '✗ No Voids'}
                          </span>
                          <span className={cr.permissions.canViewProfit ? 'text-emerald-400' : 'text-rose-400'}>
                            {cr.permissions.canViewProfit ? '✓ View Profit' : '🔒 Profit Locked'}
                          </span>
                          <span className={cr.permissions.canChangePrices ? 'text-emerald-400' : 'text-rose-400'}>
                            {cr.permissions.canChangePrices ? '✓ Change Prices' : '🔒 Prices Locked'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADD / EDIT STAFF MODAL */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <form
            onSubmit={handleSaveStaffSubmit}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl p-5 sm:p-6 text-slate-100 space-y-5 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base text-white">
                  {editingStaff ? 'Edit Staff Account & Permissions' : 'Add New Staff Member'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Full Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Blessing Okafor"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Phone Number (Optional):</label>
                <input
                  type="tel"
                  placeholder="e.g. 0803 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Assigned Role Preset:</label>
                <select
                  value={role === 'custom' ? customRoleId : role}
                  onChange={(e) => handleApplyRoleSelection(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  <optgroup label="System Standard Roles">
                    <option value="owner">👑 Business Owner / Director</option>
                    <option value="manager">🛡️ Store Manager</option>
                    <option value="cashier">💵 Sales Cashier</option>
                    <option value="inventory_manager">📦 Inventory Manager</option>
                    <option value="accountant">📊 Financial Accountant</option>
                  </optgroup>
                  {effectiveCustomRoles.length > 0 && (
                    <optgroup label="Custom Roles (Owner Created)">
                      {effectiveCustomRoles.map((cr) => (
                        <option key={cr.id} value={cr.id}>
                          ✨ {cr.name} (Custom)
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  4-Digit Numeric Login PIN:
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    maxLength={4}
                    required
                    pattern="[0-9]{4}"
                    placeholder="4 digits"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white font-mono tracking-widest focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Granular Permission Toggles Matrix */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Granular Permission Matrix</h4>
                  <p className="text-xs text-slate-400">
                    Fine-tune individual capabilities for this employee.
                  </p>
                </div>
                <span className="text-xs text-purple-400 font-semibold">Customizable</span>
              </div>

              {/* Categorized Toggle Sections */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {/* 1. SALES & POS */}
                <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-300 block">🛒 Sales & POS Register</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={permissions.canRecordSales}
                        onChange={() => togglePermission('canRecordSales')}
                        className="rounded accent-purple-600"
                      />
                      <span>Record Sales & Checkout</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={permissions.canVoidSales}
                        onChange={() => togglePermission('canVoidSales')}
                        className="rounded accent-purple-600"
                      />
                      <span>Void / Cancel Sales</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-rose-300 font-medium">
                      <input
                        type="checkbox"
                        checked={permissions.canDeleteSales}
                        onChange={() => togglePermission('canDeleteSales')}
                        className="rounded accent-rose-600"
                      />
                      <span>🚨 Delete Sales Records (Sensitive)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={permissions.canApplyDiscounts}
                        onChange={() => togglePermission('canApplyDiscounts')}
                        className="rounded accent-purple-600"
                      />
                      <span>Apply Cashier Discounts</span>
                    </label>
                  </div>
                </div>

                {/* 2. SENSITIVE PRICING & PROFIT RESTRICTIONS */}
                <div className="p-3 bg-rose-950/20 rounded-2xl border border-rose-900/40 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-xs font-bold text-rose-300">
                      🔒 Sensitive Pricing & Profit Restrictions
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-200 font-medium">
                      <input
                        type="checkbox"
                        checked={permissions.canViewProfit}
                        onChange={() => togglePermission('canViewProfit')}
                        className="rounded accent-emerald-600"
                      />
                      <span>View Profit Margins & Net Profit</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-200 font-medium">
                      <input
                        type="checkbox"
                        checked={permissions.canViewCostPrice}
                        onChange={() => togglePermission('canViewCostPrice')}
                        className="rounded accent-teal-600"
                      />
                      <span>View Wholesale Cost Prices</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-amber-300 font-medium">
                      <input
                        type="checkbox"
                        checked={permissions.canChangePrices}
                        onChange={() => togglePermission('canChangePrices')}
                        className="rounded accent-amber-600"
                      />
                      <span>Change Retail & Cost Prices</span>
                    </label>
                  </div>
                </div>

                {/* 3. STOCK & INVENTORY */}
                <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-300 block">📦 Stock & Inventory</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={permissions.canManageInventory}
                        onChange={() => togglePermission('canManageInventory')}
                        className="rounded accent-purple-600"
                      />
                      <span>Add Products & Restock</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={permissions.canDeleteProducts}
                        onChange={() => togglePermission('canDeleteProducts')}
                        className="rounded accent-purple-600"
                      />
                      <span>Delete Products from Catalog</span>
                    </label>
                  </div>
                </div>

                {/* 4. FINANCIAL & REPORTS */}
                <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-300 block">💰 Financial Ledgers & Reports</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={permissions.canManageExpenses}
                        onChange={() => togglePermission('canManageExpenses')}
                        className="rounded accent-purple-600"
                      />
                      <span>Manage Operating Expenses</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={permissions.canManageDebts}
                        onChange={() => togglePermission('canManageDebts')}
                        className="rounded accent-purple-600"
                      />
                      <span>Manage Debts & Customer Credit</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={permissions.canManageInvoices}
                        onChange={() => togglePermission('canManageInvoices')}
                        className="rounded accent-purple-600"
                      />
                      <span>Create Quotes & Invoices</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={permissions.canViewReports}
                        onChange={() => togglePermission('canViewReports')}
                        className="rounded accent-purple-600"
                      />
                      <span>View Sales & Analytics Reports</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={permissions.canExportData}
                        onChange={() => togglePermission('canExportData')}
                        className="rounded accent-purple-600"
                      />
                      <span>Export CSV Spreadsheets</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={permissions.canViewAuditLogs}
                        onChange={() => togglePermission('canViewAuditLogs')}
                        className="rounded accent-purple-600"
                      />
                      <span>View Activity Audit Logs</span>
                    </label>
                  </div>
                </div>

                {/* 5. SYSTEM ADMIN */}
                {isOwner && (
                  <div className="p-3 bg-purple-950/30 rounded-2xl border border-purple-800/50 space-y-2">
                    <span className="text-xs font-bold text-purple-300 block">👑 Store Administration</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input
                          type="checkbox"
                          checked={permissions.canManageStaff}
                          onChange={() => togglePermission('canManageStaff')}
                          className="rounded accent-purple-600"
                        />
                        <span>Manage Staff & Login PINs</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input
                          type="checkbox"
                          checked={permissions.canManageRoles}
                          onChange={() => togglePermission('canManageRoles')}
                          className="rounded accent-purple-600"
                        />
                        <span>Create & Edit Custom Roles</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input
                          type="checkbox"
                          checked={permissions.canEditSettings}
                          onChange={() => togglePermission('canEditSettings')}
                          className="rounded accent-purple-600"
                        />
                        <span>Edit Store & Bank Settings</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input
                          type="checkbox"
                          checked={permissions.canManageBackups}
                          onChange={() => togglePermission('canManageBackups')}
                          className="rounded accent-purple-600"
                        />
                        <span>Database Backups & Restore</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-semibold rounded-2xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg transition"
              >
                {editingStaff ? 'Save Changes' : 'Create Staff Member'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CUSTOM ROLE CREATOR / EDIT MODAL */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <form
            onSubmit={handleSaveRoleSubmit}
            className="bg-slate-900 border border-purple-800/80 rounded-3xl w-full max-w-2xl shadow-2xl p-5 sm:p-6 text-slate-100 space-y-5 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-base text-white">
                  {editingRole ? 'Edit Custom Role' : 'Create Custom Role'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Role Name & Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Role Title / Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shift Supervisor, Store Keeper, Auditor"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Badge Color Theme:</label>
                <div className="flex items-center gap-1.5 py-1">
                  {COLOR_OPTIONS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setRoleBadgeColor(col)}
                      className={`w-7 h-7 rounded-xl border transition ${col} ${
                        roleBadgeColor === col ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-400 block mb-1">Role Description:</label>
                <input
                  type="text"
                  placeholder="e.g. Senior cashier authorized to void mistakes and approve discounts."
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Role Permissions Matrix */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <h4 className="text-sm font-bold text-white">Select Permissions for this Role:</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-300 block">Sales & Register</span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={rolePermissions.canRecordSales}
                      onChange={() => toggleRolePermission('canRecordSales')}
                      className="rounded accent-purple-600"
                    />
                    <span>Record Sales</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={rolePermissions.canVoidSales}
                      onChange={() => toggleRolePermission('canVoidSales')}
                      className="rounded accent-purple-600"
                    />
                    <span>Void Sales</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-rose-300">
                    <input
                      type="checkbox"
                      checked={rolePermissions.canDeleteSales}
                      onChange={() => toggleRolePermission('canDeleteSales')}
                      className="rounded accent-rose-600"
                    />
                    <span>Delete Sales (Sensitive)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={rolePermissions.canApplyDiscounts}
                      onChange={() => toggleRolePermission('canApplyDiscounts')}
                      className="rounded accent-purple-600"
                    />
                    <span>Apply Discounts</span>
                  </label>
                </div>

                <div className="p-3 bg-rose-950/20 rounded-2xl border border-rose-900/40 space-y-2">
                  <span className="text-xs font-bold text-rose-300 block">🔒 Privacy & Pricing</span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200">
                    <input
                      type="checkbox"
                      checked={rolePermissions.canViewProfit}
                      onChange={() => toggleRolePermission('canViewProfit')}
                      className="rounded accent-emerald-600"
                    />
                    <span>View Profit Margins</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200">
                    <input
                      type="checkbox"
                      checked={rolePermissions.canViewCostPrice}
                      onChange={() => toggleRolePermission('canViewCostPrice')}
                      className="rounded accent-teal-600"
                    />
                    <span>View Cost Prices</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-amber-300">
                    <input
                      type="checkbox"
                      checked={rolePermissions.canChangePrices}
                      onChange={() => toggleRolePermission('canChangePrices')}
                      className="rounded accent-amber-600"
                    />
                    <span>Change Prices</span>
                  </label>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-300 block">Inventory & Ledgers</span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={rolePermissions.canManageInventory}
                      onChange={() => toggleRolePermission('canManageInventory')}
                      className="rounded accent-purple-600"
                    />
                    <span>Manage Inventory & Restock</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={rolePermissions.canManageExpenses}
                      onChange={() => toggleRolePermission('canManageExpenses')}
                      className="rounded accent-purple-600"
                    />
                    <span>Manage Expenses</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={rolePermissions.canManageDebts}
                      onChange={() => toggleRolePermission('canManageDebts')}
                      className="rounded accent-purple-600"
                    />
                    <span>Manage Debts / Credit</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={rolePermissions.canManageInvoices}
                      onChange={() => toggleRolePermission('canManageInvoices')}
                      className="rounded accent-purple-600"
                    />
                    <span>Manage Invoices</span>
                  </label>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-300 block">Reports & Admin</span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={rolePermissions.canViewReports}
                      onChange={() => toggleRolePermission('canViewReports')}
                      className="rounded accent-purple-600"
                    />
                    <span>View Sales Reports</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={rolePermissions.canExportData}
                      onChange={() => toggleRolePermission('canExportData')}
                      className="rounded accent-purple-600"
                    />
                    <span>Export CSV Data</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={rolePermissions.canViewAuditLogs}
                      onChange={() => toggleRolePermission('canViewAuditLogs')}
                      className="rounded accent-purple-600"
                    />
                    <span>View Audit Logs</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-semibold rounded-2xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg transition"
              >
                {editingRole ? 'Save Custom Role' : 'Create Custom Role'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: ADMIN SEPARATE EMPLOYEE PIN PROVISIONING */}
      {isPinModalOpen && pinTargetStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Provision Employee PIN</h3>
                  <p className="text-xs text-slate-400">Admin-controlled staff security credentials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPinModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Admin Authority Pill */}
            <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Authorized Admin:</span>
              </span>
              <span className="font-semibold text-white">
                {currentStaff.name} ({currentStaff.role})
              </span>
            </div>

            {/* Target Employee Info */}
            <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl ${
                    pinTargetStaff.avatarColor || 'bg-slate-700'
                  } flex items-center justify-center text-white font-bold text-sm shadow-sm`}
                >
                  {pinTargetStaff.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{pinTargetStaff.name}</h4>
                  <span className="text-xs text-slate-400">{pinTargetStaff.customRoleName || pinTargetStaff.role.toUpperCase()}</span>
                </div>
              </div>
              {pinTargetStaff.phone && (
                <span className="text-xs text-slate-400 font-mono">{pinTargetStaff.phone}</span>
              )}
            </div>

            {/* Notifications / Feedback */}
            {pinErrorMsg && (
              <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{pinErrorMsg}</span>
              </div>
            )}

            {pinSuccessMsg && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl text-xs text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{pinSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProvisionedPin} className="space-y-4">
              {/* 4-Digit Numeric PIN Display & Keypad */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Separate 4-Digit Counter PIN
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const rand = Math.floor(1000 + Math.random() * 9000).toString();
                      setProvisionPin(rand);
                    }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer transition"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate Random</span>
                  </button>
                </div>

                {/* PIN Display Boxes */}
                <div className="flex justify-center gap-3 py-2">
                  {[0, 1, 2, 3].map((index) => {
                    const digit = provisionPin[index];
                    return (
                      <div
                        key={index}
                        className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center text-2xl font-mono font-bold transition ${
                          digit
                            ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300 shadow-sm'
                            : 'border-slate-800 bg-slate-950 text-slate-600'
                        }`}
                      >
                        {digit || '•'}
                      </div>
                    );
                  })}
                </div>

                {/* Quick Touch Keypad */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        if (provisionPin.length < 4) {
                          setProvisionPin((prev) => prev + num.toString());
                        }
                      }}
                      className="py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-sm font-bold text-white transition active:scale-95 cursor-pointer"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setProvisionPin('')}
                    className="py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-400 transition cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (provisionPin.length < 4) {
                        setProvisionPin((prev) => prev + '0');
                      }
                    }}
                    className="py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-sm font-bold text-white transition active:scale-95 cursor-pointer"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => setProvisionPin((prev) => prev.slice(0, -1))}
                    className="py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-400 transition cursor-pointer"
                  >
                    ⌫ Back
                  </button>
                </div>
              </div>

              {/* Security Option: Require PIN Change on 1st Login */}
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={provisionMustChange}
                    onChange={(e) => setProvisionMustChange(e.target.checked)}
                    className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-200">
                    Require staff to choose their own private PIN on first login
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 pl-6.5">
                  Best security practice: Staff will be prompted to replace this admin-assigned PIN when they switch to this profile at the counter.
                </p>
              </div>

              {/* Optional Password Field */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Optional Password (for Web/Admin portal login)
                </label>
                <input
                  type="text"
                  placeholder="Optional portal password"
                  value={provisionPassword}
                  onChange={(e) => setProvisionPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Slip sharing and actions */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleCopyPinSlip}
                  className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl text-xs font-bold text-slate-200 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {pinCopied ? (
                    <>
                      <CheckCheck className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Credentials Slip Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-400" />
                      <span>Copy Access Slip for Staff (WhatsApp / SMS)</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPinModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-2xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={provisionPin.length !== 4}
                    className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 text-xs font-bold rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Save & Deploy PIN</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
