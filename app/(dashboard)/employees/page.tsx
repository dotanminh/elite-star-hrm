'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useProfile } from '@/components/profile-provider';
import { AvatarUpload } from '@/components/avatar-upload';
import { createEmployeeAction } from './actions';
import { 
  employees as empText, 
  roleLabels, 
  statusLabels, 
  common 
} from '@/lib/i18n/vi';
import { 
  Search, 
  UserPlus, 
  Edit2, 
  Loader2, 
  X,
  Briefcase,
  UserCircle
} from 'lucide-react';

export default function EmployeesPage() {
  const { profile: currentUser } = useProfile();
  const supabase = createClient();
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [titles, setTitles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedTitle, setSelectedTitle] = useState('');

  // UI Control Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeEmployee, setActiveEmployee] = useState<any>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('employee');
  const [departmentId, setDepartmentId] = useState('');
  const [titleId, setTitleId] = useState('');
  const [status, setStatus] = useState('active');
  const [hireDate, setHireDate] = useState(new Date().toISOString().split('T')[0]);

  // Extended Profile Fields
  const [employeeCode, setEmployeeCode] = useState('');
  const [gender, setGender] = useState('male');
  const [educationLevel, setEducationLevel] = useState('');
  const [address, setAddress] = useState('');
  const [hometown, setHometown] = useState('');
  const [biography, setBiography] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const isHrOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'hr';

  const fetchStaticData = async () => {
    try {
      const { data: depts } = await supabase.from('departments').select('*').order('name');
      const { data: jobs } = await supabase.from('titles').select('*').order('name');
      setDepartments(depts || []);
      setTitles(jobs || []);
    } catch (err) {
      console.error('Error fetching static metadata:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('profiles')
        .select('*, departments(name), titles(name)');

      // If user is a manager, they can only view profiles in their department
      if (currentUser?.role === 'manager' && currentUser.department_id) {
        query = query.eq('department_id', currentUser.department_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error('Error fetching employee list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchStaticData();
      fetchEmployees();
    }
  }, [currentUser]);

  // Form Reset Helper
  const resetForm = () => {
    setFullName('');
    setPhone('');
    setRole('employee');
    setDepartmentId('');
    setTitleId('');
    setStatus('active');
    setHireDate(new Date().toISOString().split('T')[0]);
    setEmployeeCode('');
    setGender('male');
    setEducationLevel('');
    setAddress('');
    setHometown('');
    setBiography('');
    setAvatarUrl('');
    setFormError(null);
  };

  // Open Edit Modal
  const openEdit = (emp: any) => {
    setActiveEmployee(emp);
    setFullName((emp.last_name ? emp.last_name + ' ' : '') + (emp.first_name || ''));
    setPhone(emp.phone || '');
    setRole(emp.role || 'employee');
    setDepartmentId(emp.department_id || '');
    setTitleId(emp.title_id || '');
    setStatus(emp.status || 'active');
    setHireDate(emp.hire_date || '');
    setEmployeeCode(emp.employee_code || '');
    setGender(emp.gender || 'male');
    setEducationLevel(emp.education_level || '');
    setAddress(emp.address || '');
    setHometown(emp.hometown || '');
    setBiography(emp.biography || '');
    setAvatarUrl(emp.avatar_url || '');
    setShowEditModal(true);
  };

  // Add Employee Handler
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName) {
      setFormError('Vui lòng nhập Họ và Tên');
      return;
    }

    setFormSubmitting(true);
    try {
      const result = await createEmployeeAction({
        fullName,
        phone,
        role,
        departmentId,
        titleId,
        status,
        hireDate,
        employeeCode,
        gender,
        educationLevel,
        address,
        hometown,
        biography,
        actorId: currentUser?.id || ''
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      if (avatarUrl && result.userId) {
        await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', result.userId);
      }

      setShowAddModal(false);
      resetForm();
      fetchEmployees();
    } catch (err: any) {
      setFormError(err.message || empText.errors.creationError);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Edit Employee Handler
  const handleEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName) {
      setFormError('Vui lòng nhập Họ và Tên');
      return;
    }

    const nameParts = fullName.trim().split(' ');
    const editFirstName = nameParts.pop() || '';
    const editLastName = nameParts.join(' ');

    setFormSubmitting(true);
    try {
      const oldValues = {
        first_name: activeEmployee.first_name,
        last_name: activeEmployee.last_name,
        role: activeEmployee.role,
        phone: activeEmployee.phone,
        department_id: activeEmployee.department_id,
        title_id: activeEmployee.title_id,
        status: activeEmployee.status,
        hire_date: activeEmployee.hire_date,
        employee_code: activeEmployee.employee_code,
        gender: activeEmployee.gender,
        education_level: activeEmployee.education_level,
        address: activeEmployee.address,
        hometown: activeEmployee.hometown,
        biography: activeEmployee.biography
      };

      const newValues = {
        first_name: editFirstName,
        last_name: editLastName,
        role,
        phone: phone || null,
        department_id: departmentId || null,
        title_id: titleId || null,
        status,
        hire_date: hireDate,
        employee_code: employeeCode || null,
        gender: gender || null,
        education_level: educationLevel || null,
        address: address || null,
        hometown: hometown || null,
        biography: biography || null,
        avatar_url: avatarUrl || null
      };

      // Update in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update(newValues)
        .eq('id', activeEmployee.id);

      if (updateError) throw updateError;

      // Log action in audit logs
      await supabase.from('audit_logs').insert({
        actor_id: currentUser?.id,
        action: 'update_employee',
        table_name: 'profiles',
        record_id: activeEmployee.id,
        old_values: oldValues,
        new_values: newValues
      });

      setShowEditModal(false);
      setActiveEmployee(null);
      resetForm();
      fetchEmployees();
    } catch (err: any) {
      setFormError(err.message || empText.errors.updateError);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Filter computation
  const filteredEmployees = employees.filter((emp) => {
    const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
    const emailMatch = (emp.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const nameMatch = fullName.includes(searchQuery.toLowerCase());
    const matchesSearch = nameMatch || emailMatch;

    const matchesDept = selectedDept ? emp.department_id === selectedDept : true;
    const matchesTitle = selectedTitle ? emp.title_id === selectedTitle : true;

    return matchesSearch && matchesDept && matchesTitle;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{empText.title}</h1>
          <p className="text-sm text-slate-500">{empText.subtitle}</p>
        </div>
        {isHrOrAdmin && (
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-colors min-h-[44px]"
          >
            <UserPlus className="h-4 w-4" />
            {empText.addEmployee}
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={empText.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 w-full rounded-lg border border-slate-300 text-sm focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700 bg-white"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          
          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="border border-slate-300 rounded-lg py-2 px-3 text-xs bg-white focus:border-teal-700 focus:outline-none"
          >
            <option value="">{empText.allDepartments}</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>

          {/* Title Filter */}
          <select
            value={selectedTitle}
            onChange={(e) => setSelectedTitle(e.target.value)}
            className="border border-slate-300 rounded-lg py-2 px-3 text-xs bg-white focus:border-teal-700 focus:outline-none"
          >
            <option value="">{empText.allPositions}</option>
            {titles.map((job) => (
              <option key={job.id} value={job.id}>{job.name}</option>
            ))}
          </select>

        </div>
      </div>

      {/* Employees Grid Table & Cards */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 text-teal-700 animate-spin" />
            <span className="text-sm text-slate-500 font-medium">{empText.fetchingRecords}</span>
          </div>
        ) : filteredEmployees.length > 0 ? (
          <>
            {/* Desktop Table View (>= 800px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs text-slate-650">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <th className="py-3.5 px-4">{empText.name}</th>
                    <th className="py-3.5 px-4">{empText.contact}</th>
                    <th className="py-3.5 px-4">{empText.departmentTitle}</th>
                    <th className="py-3.5 px-4">{empText.statusRole}</th>
                    <th className="py-3.5 px-4">{empText.hireDate}</th>
                    {isHrOrAdmin && <th className="py-3.5 px-4 text-center">{empText.action}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-3">
                        {emp.avatar_url ? (
                          <img src={emp.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm" />
                        ) : (
                          <UserCircle className="w-8 h-8 text-slate-300" strokeWidth={1} />
                        )}
                        <span>{emp.last_name} {emp.first_name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-bold">{emp.employee_code || '-'}</div>
                        {emp.phone && <div className="text-[10px] text-slate-400 mt-0.5">{emp.phone}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3 text-slate-400" />
                          <span className="font-semibold text-slate-800">{emp.departments?.name || empText.unassigned}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{emp.titles?.name || empText.noPosition}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            emp.status === 'active' ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {statusLabels[emp.status] || emp.status}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            {roleLabels[emp.role] || emp.role}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-500">
                        {emp.hire_date}
                      </td>
                      {isHrOrAdmin && (
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => openEdit(emp)}
                            className="p-1.5 text-teal-600 hover:text-teal-850 rounded-md hover:bg-teal-50 transition-colors inline-flex items-center"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card-Based View (< 800px) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredEmployees.map((emp) => (
                <div key={emp.id} className="p-4 hover:bg-slate-50/40 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-3">
                      {emp.avatar_url ? (
                        <img src={emp.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm" />
                      ) : (
                        <UserCircle className="w-10 h-10 text-slate-300" strokeWidth={1} />
                      )}
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{emp.last_name} {emp.first_name}</h3>
                        <p className="text-xs text-slate-500 font-bold">{emp.employee_code || '-'}</p>
                        {emp.phone && <p className="text-[10px] text-slate-400 mt-0.5">{emp.phone}</p>}
                      </div>
                    </div>
                    {isHrOrAdmin && (
                      <button
                        onClick={() => openEdit(emp)}
                        className="p-2 text-teal-600 hover:text-teal-800 rounded-lg hover:bg-teal-50 border border-slate-200 transition-colors flex items-center justify-center min-w-[36px] min-h-[36px]"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold flex items-center gap-1">
                      <Briefcase className="h-3 w-3 text-slate-400" />
                      {emp.departments?.name || empText.unassigned}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {emp.titles?.name || empText.noPosition}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        emp.status === 'active' ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {statusLabels[emp.status] || emp.status}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">
                        {roleLabels[emp.role] || emp.role}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {emp.hire_date}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-slate-500 italic text-xs">
            {empText.noResults}
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h2 className="text-md font-bold text-slate-800">{empText.addTitle}</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-755 font-semibold">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Họ và Tên</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 placeholder-slate-400 min-h-[40px]"
                    placeholder="VD: Nguyễn Văn A"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">{empText.roleType}</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                  >
                    <option value="employee">{empText.roleEmployee}</option>
                    <option value="manager">{empText.roleManager}</option>
                    <option value="hr">{empText.roleHR}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">{empText.phoneNumber}</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                    placeholder="0987654321"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">{empText.hireDate}</label>
                  <input
                    type="date"
                    value={hireDate}
                    onChange={(e) => setHireDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">{empText.department}</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                  >
                    <option value="">{empText.unassigned}</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">{empText.jobTitle}</label>
                  <select
                    value={titleId}
                    onChange={(e) => setTitleId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                  >
                    <option value="">{empText.noTitle}</option>
                    {titles
                      .filter((t) => !departmentId || t.department_id === departmentId)
                      .map((job) => (
                        <option key={job.id} value={job.id}>{job.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Mã NV / Giới tính</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={employeeCode}
                      onChange={(e) => setEmployeeCode(e.target.value)}
                      className="w-1/2 px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                      placeholder="Tự động nếu để trống"
                    />
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-1/2 px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                    >
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Ảnh đại diện (Avatar)</label>
                  <div className="pt-2">
                    <AvatarUpload url={avatarUrl} onUpload={setAvatarUrl} employeeCode={employeeCode} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Trình độ học vấn</label>
                  <input
                    type="text"
                    value={educationLevel}
                    onChange={(e) => setEducationLevel(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                    placeholder="Đại học, Cao đẳng..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Quê quán</label>
                    <input
                      type="text"
                      value={hometown}
                      onChange={(e) => setHometown(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Địa chỉ thường trú</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Ghi chú nhân thân</label>
                  <textarea
                    value={biography}
                    onChange={(e) => setBiography(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 placeholder-slate-400"
                    placeholder="Lý lịch, thông tin thêm..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 min-h-[36px]"
                >
                  {empText.cancel}
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-850 text-white rounded-lg text-xs font-semibold flex items-center gap-2 min-h-[36px]"
                >
                  {formSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
                  {empText.registerSave}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h2 className="text-md font-bold text-slate-800">{empText.editTitle}</h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditEmployee} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-650 font-semibold">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">{empText.emailImmutable}</label>
                  <input
                    type="email"
                    value={activeEmployee?.email || ''}
                    disabled
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed min-h-[40px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">{empText.statusLabel}</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                  >
                    <option value="active">{statusLabels.active}</option>
                    <option value="suspended">{statusLabels.suspended}</option>
                    <option value="terminated">{statusLabels.terminated}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Họ và Tên</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                    placeholder="VD: Nguyễn Văn A"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">{empText.phoneNumber}</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">{empText.hireDate}</label>
                  <input
                    type="date"
                    value={hireDate}
                    onChange={(e) => setHireDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">{empText.department}</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                  >
                    <option value="">{empText.unassigned}</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">{empText.jobTitle}</label>
                  <select
                    value={titleId}
                    onChange={(e) => setTitleId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                  >
                    <option value="">{empText.noTitle}</option>
                    {titles
                      .filter((t) => !departmentId || t.department_id === departmentId)
                      .map((job) => (
                        <option key={job.id} value={job.id}>{job.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Mã NV / Giới tính</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={employeeCode}
                      onChange={(e) => setEmployeeCode(e.target.value)}
                      className="w-1/2 px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                      placeholder="Tự động nếu để trống"
                    />
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-1/2 px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                    >
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Ảnh đại diện (Avatar)</label>
                  <div className="pt-2">
                    <AvatarUpload url={avatarUrl} onUpload={setAvatarUrl} employeeCode={employeeCode} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Trình độ học vấn</label>
                  <input
                    type="text"
                    value={educationLevel}
                    onChange={(e) => setEducationLevel(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                    placeholder="Đại học, Cao đẳng..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Quê quán</label>
                    <input
                      type="text"
                      value={hometown}
                      onChange={(e) => setHometown(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Địa chỉ thường trú</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Ghi chú nhân thân</label>
                  <textarea
                    value={biography}
                    onChange={(e) => setBiography(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 placeholder-slate-400"
                    placeholder="Lý lịch, thông tin thêm..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">{empText.systemRole}</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                  >
                    <option value="employee">{roleLabels.employee}</option>
                    <option value="manager">{roleLabels.manager}</option>
                    <option value="hr">{roleLabels.hr}</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 min-h-[36px]"
                >
                  {empText.cancel}
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-850 text-white rounded-lg text-xs font-semibold flex items-center gap-2 min-h-[36px]"
                >
                  {formSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
                  {empText.saveChanges}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
