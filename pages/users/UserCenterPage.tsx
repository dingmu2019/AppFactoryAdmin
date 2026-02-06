
import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit2, AppWindow, ChevronLeft, ChevronRight, User as UserIcon, Shield, Mail, Clock, X, MapPin, Phone } from 'lucide-react';
import { useI18n } from '../../contexts';
import { MOCK_APPS } from '../../constants';
import { User, UserRole, UserStatus, UserGender, UserRegion } from '../../types';
import { supabase } from '../../lib/supabase';

export const UserCenterPage: React.FC = () => {
  const { t } = useI18n();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<any>>({});

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppId, setSelectedAppId] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Fetch Users from Supabase
  const fetchUsers = async () => {
    setIsLoading(true);
    let query = supabase
      .from('users')
      .select('*');

    // Apply filters (basic client-side filtering logic for now, or build query)
    // Note: For large datasets, server-side pagination and filtering is better.
    // Here we fetch all and filter client-side for simplicity as per current structure, 
    // or we can add .eq() clauses. Let's do basic fetch first.
    
    const { data, error } = await query;

    if (error) {
      console.error('Error fetching users:', error);
    } else {
      // Map Supabase data to local User type if needed, or use as is.
      // The schema matches well enough: full_name -> name, etc.
      const mappedUsers = data?.map(u => ({
        id: u.id,
        name: u.full_name || u.email?.split('@')[0] || 'Unknown',
        email: u.email,
        role: u.role, // Note: Schema has roles[] array, mock has string. Adjusting.
        roles: u.roles,
        appId: u.source_app_id || 'platform', // Mapping source_app_id to appId
        status: u.status,
        lastLogin: u.last_sign_in_at || '-',
        region: u.region,
        phone: u.phone_number,
        gender: u.gender
      })) || [];
      setUsers(mappedUsers);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedAppId, selectedRole, selectedStatus, itemsPerPage]);

  // Filtering Logic
  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          user.email?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesApp = selectedAppId === 'all' || 
                       (selectedAppId === 'platform' && user.appId === 'platform') ||
                       user.appId === selectedAppId;
    
    // Handle multi-role check
    const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];
    const matchesRole = selectedRole === 'all' || userRoles.includes(selectedRole);
    
    const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus;

    return matchesSearch && matchesApp && matchesRole && matchesStatus;
  });

  // Pagination Logic
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const handleEditUser = (user?: User) => {
    if (user) {
      // Clone user to avoid direct mutation issues
      setEditingUser(JSON.parse(JSON.stringify(user)));
    } else {
      setEditingUser({
        name: '',
        email: '',
        role: 'user',
        appId: MOCK_APPS[0].id,
        status: 'active',
        joinDate: new Date().toISOString().split('T')[0],
        gender: 'other',
        phone: '',
        region: { country: 'US', province: '', city: '' }
      });
    }
    setIsModalOpen(true);
  };

  const handleRegionChange = (field: keyof UserRegion, value: string) => {
      setEditingUser(prev => ({
          ...prev,
          region: {
              ...(prev.region || { country: '', province: '', city: '' }),
              [field]: value
          }
      }));
  };

  const handleSave = () => {
      if (!editingUser.name || !editingUser.email) {
          alert('Name and Email are required.');
          return;
      }
      
      if (editingUser.id) {
          setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...editingUser } as User : u));
      } else {
          const newUser = {
              ...editingUser,
              id: `u_${Date.now()}`,
          } as User;
          setUsers(prev => [newUser, ...prev]);
      }
      setIsModalOpen(false);
  };

  const getAppName = (appId?: string) => {
    if (appId === 'platform') return 'Platform';
    return MOCK_APPS.find(a => a.id === appId)?.name || appId;
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      case 'editor': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'viewer': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
      default: return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800';
    }
  };

  const getStatusColor = (status: UserStatus) => {
     switch (status) {
        case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
        case 'suspended': return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800';
        case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
     }
  };

  const formatLocation = (region?: UserRegion) => {
      if (!region) return '-';
      const parts = [region.city, region.province, region.country].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : '-';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('users.title')}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t('users.subtitle')}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors duration-200">
        {/* Filters Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex flex-wrap gap-4 w-full xl:w-auto">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('common.filter') + " Name, Email..."}
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                {/* App Filter */}
                <div className="relative min-w-[160px]">
                    <select 
                        value={selectedAppId}
                        onChange={(e) => setSelectedAppId(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                    >
                        <option value="all">{t('common.allApps')}</option>
                        <option value="platform">{t('users.form.platformAdmin')}</option>
                        {MOCK_APPS.map(app => (
                            <option key={app.id} value={app.id}>{app.name}</option>
                        ))}
                    </select>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <AppWindow size={16} />
                    </div>
                </div>

                 {/* Role Filter */}
                 <div className="relative min-w-[140px]">
                    <select 
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                    >
                        <option value="all">{t('common.allRoles')}</option>
                        <option value="admin">{t('users.roles.admin')}</option>
                        <option value="user">{t('users.roles.user')}</option>
                        <option value="editor">{t('users.roles.editor')}</option>
                        <option value="viewer">{t('users.roles.viewer')}</option>
                    </select>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <Shield size={16} />
                    </div>
                </div>

                {/* Status Filter */}
                <div className="relative min-w-[140px]">
                    <select 
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                    >
                        <option value="all">{t('common.allStatus')}</option>
                        <option value="active">{t('users.status.active')}</option>
                        <option value="suspended">{t('users.status.suspended')}</option>
                        <option value="pending">{t('users.status.pending')}</option>
                    </select>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <Filter size={16} />
                    </div>
                </div>
            </div>
            
            <button 
              onClick={() => handleEditUser()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors w-full xl:w-auto justify-center"
            >
              <Plus size={18} /> {t('users.newUser')}
            </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3 font-medium">{t('users.table.user')}</th>
                <th className="px-6 py-3 font-medium">{t('users.table.app')}</th>
                <th className="px-6 py-3 font-medium">{t('users.table.role')}</th>
                <th className="px-6 py-3 font-medium">{t('users.table.status')}</th>
                <th className="px-6 py-3 font-medium">{t('users.table.location')}</th>
                <th className="px-6 py-3 font-medium">{t('users.table.lastLogin')}</th>
                <th className="px-6 py-3 font-medium text-right">{t('common.edit')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-medium">
                         {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{user.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                           <Mail size={10} /> {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        {user.appId === 'platform' ? <Shield size={14} className="text-purple-500" /> : <AppWindow size={14} className="text-slate-400" />}
                        <span>{getAppName(user.appId)}</span>
                     </div>
                  </td>
                  <td className="px-6 py-4">
                     <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}>
                        {t(`users.roles.${user.role}`)}
                     </span>
                  </td>
                  <td className="px-6 py-4">
                     <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(user.status)}`}>
                        {t(`users.status.${user.status}`)}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                     <div className="flex items-center gap-1.5" title={formatLocation(user.region)}>
                        <MapPin size={14} className="text-slate-400" />
                        <span className="truncate max-w-[120px]">{user.region?.country || '-'}</span>
                     </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                     <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-slate-400" />
                        {user.lastLogin === '-' ? '-' : new Date(user.lastLogin).toLocaleDateString()}
                     </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleEditUser(user)}
                      className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1"
                    >
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
               {filteredUsers.length === 0 && (
                    <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                            No users found matching filters.
                        </td>
                    </tr>
                )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600 dark:text-slate-400">
             <div className="flex items-center gap-4">
                <span>
                   {t('common.showing')} <span className="font-medium text-slate-900 dark:text-white">{Math.min(startIndex + 1, totalItems)}</span> {t('common.to')} <span className="font-medium text-slate-900 dark:text-white">{Math.min(endIndex, totalItems)}</span> {t('common.of')} <span className="font-medium text-slate-900 dark:text-white">{totalItems}</span> {t('common.results')}
                </span>
                
                <div className="flex items-center gap-2">
                    <span className="hidden sm:inline">{t('common.rowsPerPage')}:</span>
                    <select 
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value={20}>20</option>
                        <option value={30}>30</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
             </div>

             <div className="flex items-center gap-2">
                <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                    <ChevronLeft size={16} /> {t('common.prev')}
                </button>
                <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                    {t('common.next')} <ChevronRight size={16} />
                </button>
             </div>
        </div>
      </div>

       {/* Edit/Create Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingUser.id ? t('common.edit') : t('users.newUser')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto">
                 {/* Basic Info Section */}
                 <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <UserIcon size={16} className="text-indigo-500" /> {t('users.form.userInfo')}
                    </h4>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                {t('users.form.name')} <span className="text-rose-500">*</span>
                            </label>
                            <input 
                                type="text" 
                                value={editingUser.name}
                                onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('users.form.gender')}</label>
                            <select 
                                value={editingUser.gender}
                                onChange={e => setEditingUser({...editingUser, gender: e.target.value as UserGender})}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="male">{t('users.gender.male')}</option>
                                <option value="female">{t('users.gender.female')}</option>
                                <option value="other">{t('users.gender.other')}</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                {t('users.form.email')} <span className="text-rose-500">*</span>
                            </label>
                            <input 
                                type="email" 
                                value={editingUser.email}
                                onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('users.form.phone')}</label>
                            <input 
                                type="text" 
                                value={editingUser.phone || ''}
                                onChange={e => setEditingUser({...editingUser, phone: e.target.value})}
                                placeholder="+1 555-0199"
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>
                 </div>

                 {/* Region Section */}
                 <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <MapPin size={16} className="text-emerald-500" /> {t('users.form.regionInfo')}
                    </h4>
                    
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('users.form.country')}</label>
                            <select 
                                value={editingUser.region?.country || ''}
                                onChange={e => handleRegionChange('country', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="">Select...</option>
                                <option value="CN">China (CN)</option>
                                <option value="US">USA (US)</option>
                                <option value="GB">UK (GB)</option>
                                <option value="JP">Japan (JP)</option>
                                <option value="AU">Australia (AU)</option>
                                <option value="SG">Singapore (SG)</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('users.form.province')}</label>
                            <input 
                                type="text"
                                value={editingUser.region?.province || ''}
                                onChange={e => handleRegionChange('province', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                         <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('users.form.city')}</label>
                            <input 
                                type="text"
                                value={editingUser.region?.city || ''}
                                onChange={e => handleRegionChange('city', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>
                 </div>

                 {/* Permissions/App Section */}
                 <div className="space-y-4">
                     <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <Shield size={16} className="text-amber-500" /> {t('users.roles.admin')} & {t('users.table.app')}
                     </h4>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {t('users.form.selectApp')} <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                            <select 
                                value={editingUser.appId}
                                onChange={e => setEditingUser({...editingUser, appId: e.target.value})}
                                className="w-full px-3 py-2 pl-9 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="platform">{t('users.form.platformAdmin')}</option>
                                {MOCK_APPS.map(app => (
                                    <option key={app.id} value={app.id}>{app.name}</option>
                                ))}
                            </select>
                            <AppWindow size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                {t('users.form.selectRole')} <span className="text-rose-500">*</span>
                            </label>
                            <select 
                                value={editingUser.role}
                                onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="admin">{t('users.roles.admin')}</option>
                                <option value="user">{t('users.roles.user')}</option>
                                <option value="editor">{t('users.roles.editor')}</option>
                                <option value="viewer">{t('users.roles.viewer')}</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                {t('users.form.selectStatus')} <span className="text-rose-500">*</span>
                            </label>
                            <select 
                                value={editingUser.status}
                                onChange={e => setEditingUser({...editingUser, status: e.target.value as UserStatus})}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="active">{t('users.status.active')}</option>
                                <option value="suspended">{t('users.status.suspended')}</option>
                                <option value="pending">{t('users.status.pending')}</option>
                            </select>
                        </div>
                    </div>
                 </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end gap-3">
               <button 
                 onClick={() => setIsModalOpen(false)}
                 className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
               >
                 {t('common.cancel')}
               </button>
               <button 
                 onClick={handleSave}
                 className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-none"
               >
                 {t('common.save')}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
