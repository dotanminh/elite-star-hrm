'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useProfile } from '@/components/profile-provider';
import { 
  Search, 
  Filter, 
  UserPlus, 
  Edit2, 
  Loader2, 
  X,
  CheckCircle,
  Briefcase
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
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('employee');
  const [departmentId, setDepartmentId] = useState('');
  const [titleId, setTitleId] = useState('');
  const [status, setStatus] = useState('active');
  const [hireDate, setHireDate] = useState(new Date().toISOString().split('T')[0]);

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
    setEmail('');
    setFirstName('');
    setLastName('');
    setPhone('');
    setRole('employee');
    setDepartmentId('');
    setTitleId('');
    setStatus('active');
    setHireDate(new Date().toISOString().split('T')[0]);
    setFormError(null);
  };

  // Open Edit Modal
  const openEdit = (emp: any) => {
    setActiveEmployee(emp);
    setFirstName(emp.first_name || '');
    setLastName(emp.last_name || '');
    setPhone(emp.phone || '');
    setRole(emp.role || 'employee');
    setDepartmentId(emp.department_id || '');
    setTitleId(emp.title_id || '');
    setStatus(emp.status || 'active');
    setHireDate(emp.hire_date || '');
    setShowEditModal(true);
  };

  // Add Employee Handler
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email || !firstName || !lastName) {
      setFormError('Email, First Name, and Last Name are required');
      return;
    }

    setFormSubmitting(true);
    try {
      // 1. Sign up the user in Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: 'password123', // Temporary default password
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role,
            phone,
            hire_date: hireDate
          }
        }
      });

      if (authError) throw authError;

      const newUserId = authData.user?.id;
      if (!newUserId) throw new Error('User creation returned empty ID');

      // 2. Associate department and title (since triggers sync first name/last name/role, we update the remaining fields)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          department_id: departmentId || null,
          title_id: titleId || null,
        })
        .eq('id', newUserId);

      if (profileError) throw profileError;

      // 3. Write record into Audit Logs
      await supabase.from('audit_logs').insert({
        actor_id: currentUser?.id,
        action: 'create_employee',
        table_name: 'profiles',
        record_id: newUserId,
        new_values: {
          email,
          first_name: firstName,
          last_name: lastName,
          role,
          phone,
          department_id: departmentId || null,
          title_id: titleId || null,
          status,
          hire_date: hireDate
        }
      });

      setShowAddModal(false);
      resetForm();
      fetchEmployees();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred during employee creation');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Edit Employee Handler
  const handleEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!firstName || !lastName) {
      setFormError('First Name and Last Name are required');
      return;
    }

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
        hire_date: activeEmployee.hire_date
      };

      const newValues = {
        first_name: firstName,
        last_name: lastName,
        role,
        phone: phone || null,
        department_id: departmentId || null,
        title_id: titleId || null,
        status,
        hire_date: hireDate
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
      setFormError(err.message || 'An error occurred during updating employee info');
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
          <h1 className="text-2xl font-bold text-slate-900">Employee Directory</h1>
          <p className="text-sm text-slate-500">Search and manage operational staff, trainers, and chefs.</p>
        </div>
        {isHrOrAdmin && (
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Add Employee
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
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
            <option value="">All Departments</option>
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
            <option value="">All Positions</option>
            {titles.map((job) => (
              <option key={job.id} value={job.id}>{job.name}</option>
            ))}
          </select>

        </div>
      </div>

      {/* Employees Grid Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 text-teal-700 animate-spin" />
            <span className="text-sm text-slate-500 font-medium">Fetching roster records...</span>
          </div>
        ) : filteredEmployees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-slate-650">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-4">Name</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Department &amp; Title</th>
                  <th className="py-3.5 px-4">Status &amp; Role</th>
                  <th className="py-3.5 px-4">Hire Date</th>
                  {isHrOrAdmin && <th className="py-3.5 px-4 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {emp.first_name} {emp.last_name}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800">{emp.email}</div>
                      {emp.phone && <div className="text-[10px] text-slate-400 mt-0.5">{emp.phone}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3 text-slate-400" />
                        <span className="font-semibold text-slate-800">{emp.departments?.name || 'Unassigned'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{emp.titles?.name || 'No Position'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          emp.status === 'active' ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {emp.status}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          {emp.role}
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
                          className="p-1.5 text-teal-600 hover:text-teal-800 rounded-md hover:bg-teal-50 transition-colors inline-flex items-center"
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
        ) : (
          <div className="p-12 text-center text-slate-500">
            No employees found matching the given filters.
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h2 className="text-md font-bold text-slate-850">Add New Employee Profile</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-450 hover:text-slate-650">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-650">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700"
                    placeholder="emp@elitestar.com"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Role Type</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700"
                  >
                    <option value="employee">Employee (General Staff)</option>
                    <option value="manager">Manager (Department Head)</option>
                    <option value="hr">HR Specialist</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700"
                    placeholder="0987654321"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Hire Date</label>
                  <input
                    type="date"
                    value={hireDate}
                    onChange={(e) => setHireDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Department</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700"
                  >
                    <option value="">Unassigned</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Job Title</label>
                  <select
                    value={titleId}
                    onChange={(e) => setTitleId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700"
                  >
                    <option value="">No Title</option>
                    {titles
                      .filter((t) => !departmentId || t.department_id === departmentId)
                      .map((job) => (
                        <option key={job.id} value={job.id}>{job.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-850 text-white rounded-lg text-xs font-semibold flex items-center gap-2"
                >
                  {formSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
                  Register &amp; Save
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
              <h2 className="text-md font-bold text-slate-855">Edit Employee Profile</h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-450 hover:text-slate-650">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditEmployee} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-650">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Email (Immutable)</label>
                  <input
                    type="email"
                    value={activeEmployee?.email || ''}
                    disabled
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Hire Date</label>
                  <input
                    type="date"
                    value={hireDate}
                    onChange={(e) => setHireDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Department</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700"
                  >
                    <option value="">Unassigned</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Job Title</label>
                  <select
                    value={titleId}
                    onChange={(e) => setTitleId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700"
                  >
                    <option value="">No Title</option>
                    {titles
                      .filter((t) => !departmentId || t.department_id === departmentId)
                      .map((job) => (
                        <option key={job.id} value={job.id}>{job.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">System Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700"
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="hr">HR Specialist</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-850 text-white rounded-lg text-xs font-semibold flex items-center gap-2"
                >
                  {formSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
