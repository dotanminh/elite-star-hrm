'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useProfile } from '@/components/profile-provider';
import { toast } from 'sonner';
import { 
  attendanceStatusLabels, 
  roleLabels 
} from '@/lib/i18n/vi';
import { 
  Search, 
  Edit2, 
  Trash2, 
  Loader2, 
  X,
  PlusCircle,
  Calendar
} from 'lucide-react';

export default function ManageAttendancePage() {
  const { profile: currentUser } = useProfile();
  const supabase = createClient();

  const [logs, setLogs] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [activeLog, setActiveLog] = useState<any>(null);
  
  // Form fields
  const [employeeId, setEmployeeId] = useState('');
  const [workDate, setWorkDate] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [status, setStatus] = useState('present');

  const isHrOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'hr';

  const fetchData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      
      // Fetch Employees for dropdown
      const { data: empData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, employee_code, departments(name)')
        .order('last_name');
      setEmployees(empData || []);

      // Fetch Attendance Logs for the selected date
      let query = supabase
        .from('attendance_logs')
        .select(`
          *,
          profiles (first_name, last_name, employee_code, departments(name))
        `)
        .order('check_in', { ascending: false });

      if (startDate) {
        query = query.gte('work_date', startDate);
      }
      if (endDate) {
        query = query.lte('work_date', endDate);
      }

      const { data: logsData, error } = await query;
      if (error) throw error;
      setLogs(logsData || []);
    } catch (err: any) {
      toast.error('Lỗi khi tải dữ liệu chấm công');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser, startDate, endDate]);

  const resetForm = () => {
    setEmployeeId('');
    setWorkDate(new Date().toISOString().split('T')[0]);
    setCheckIn('');
    setCheckOut('');
    setStatus('present');
  };

  const openEdit = (log: any) => {
    setActiveLog(log);
    setEmployeeId(log.employee_id);
    setWorkDate(log.work_date);
    // Convert timestamp to HH:mm format for input type="time"
    setCheckIn(log.check_in ? new Date(log.check_in).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '');
    setCheckOut(log.check_out ? new Date(log.check_out).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '');
    setStatus(log.status);
    setShowEditModal(true);
  };

  const combineDateAndTime = (dateStr: string, timeStr: string) => {
    if (!timeStr) return null;
    // Creates an ISO string from local date and time
    const [hours, minutes] = timeStr.split(':');
    const d = new Date(dateStr);
    d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return d.toISOString();
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !workDate) {
      toast.error('Vui lòng chọn nhân viên và ngày làm việc');
      return;
    }
    setFormSubmitting(true);
    try {
      const checkInISO = combineDateAndTime(workDate, checkIn);
      const checkOutISO = combineDateAndTime(workDate, checkOut);

      const newLog = {
        employee_id: employeeId,
        work_date: workDate,
        check_in: checkInISO,
        check_out: checkOutISO,
        status: status,
        check_in_ip: 'Manual (Admin)',
        check_out_ip: checkOutISO ? 'Manual (Admin)' : null,
      };

      const { error } = await supabase.from('attendance_logs').insert(newLog);
      if (error) throw error;

      toast.success('Thêm lượt chấm công (bù công) thành công');
      setShowAddModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi thêm lượt chấm công');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      const checkInISO = combineDateAndTime(workDate, checkIn);
      const checkOutISO = combineDateAndTime(workDate, checkOut);

      const updateData = {
        work_date: workDate,
        check_in: checkInISO,
        check_out: checkOutISO,
        status: status,
      };

      const { error } = await supabase
        .from('attendance_logs')
        .update(updateData)
        .eq('id', activeLog.id);

      if (error) throw error;

      toast.success('Cập nhật lượt chấm công thành công');
      setShowEditModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi cập nhật lượt chấm công');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setFormSubmitting(true);
    try {
      if (activeLog) {
        // Single delete
        const { error } = await supabase
          .from('attendance_logs')
          .delete()
          .eq('id', activeLog.id);
          
        if (error) throw error;
        toast.success('Xóa lượt chấm công thành công');
      } else if (selectedLogIds.length > 0) {
        // Bulk delete
        const { error } = await supabase
          .from('attendance_logs')
          .delete()
          .in('id', selectedLogIds);
          
        if (error) throw error;
        toast.success(`Đã xóa ${selectedLogIds.length} lượt chấm công`);
        setSelectedLogIds([]);
      }

      setShowDeleteConfirm(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi xóa lượt chấm công');
    } finally {
      setFormSubmitting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedLogIds.length === filteredLogs.length) {
      setSelectedLogIds([]);
    } else {
      setSelectedLogIds(filteredLogs.map(log => log.id));
    }
  };

  const toggleSelectLog = (id: string) => {
    if (selectedLogIds.includes(id)) {
      setSelectedLogIds(selectedLogIds.filter(logId => logId !== id));
    } else {
      setSelectedLogIds([...selectedLogIds, id]);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const fullName = `${log.profiles?.last_name || ''} ${log.profiles?.first_name || ''}`.toLowerCase();
    const code = (log.profiles?.employee_code || '').toLowerCase();
    const searchLower = searchQuery.toLowerCase();
    return fullName.includes(searchLower) || code.includes(searchLower);
  });

  if (!isHrOrAdmin) {
    return <div className="p-12 text-center text-slate-500">Bạn không có quyền truy cập trang này.</div>;
  }

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý Chấm công</h1>
          <p className="text-sm text-slate-500">Xem, chỉnh sửa, và bù công cho nhân viên</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedLogIds.length > 0 && (
            <button
              onClick={() => {
                setActiveLog(null); // clear single log to signify bulk delete
                setShowDeleteConfirm(true);
              }}
              className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-colors border border-red-200 min-h-[44px]"
            >
              <Trash2 className="h-4 w-4" />
              Xóa {selectedLogIds.length} mục
            </button>
          )}
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-colors min-h-[44px]"
          >
            <PlusCircle className="h-4 w-4" />
            Thêm Bù Công
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mã NV..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 w-full rounded-lg border border-slate-300 text-sm focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700 bg-white"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 bg-white focus-within:border-teal-700">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm bg-transparent border-none focus:ring-0 p-0"
            />
            <span className="text-slate-400">-</span>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm bg-transparent border-none focus:ring-0 p-0"
            />
          </div>
          {(startDate || endDate) && (
            <button 
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs text-teal-700 font-semibold hover:underline whitespace-nowrap"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs text-slate-650">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <th className="py-3.5 px-4 w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-600 cursor-pointer"
                    checked={filteredLogs.length > 0 && selectedLogIds.length === filteredLogs.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="py-3.5 px-4">Nhân viên</th>
                <th className="py-3.5 px-4">Ngày</th>
                <th className="py-3.5 px-4">Giờ Vào (In)</th>
                <th className="py-3.5 px-4">Giờ Ra (Out)</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-teal-700" />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className={`hover:bg-slate-50/50 ${selectedLogIds.includes(log.id) ? 'bg-teal-50/30' : ''}`}>
                    <td className="py-3 px-4">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-600 cursor-pointer"
                        checked={selectedLogIds.includes(log.id)}
                        onChange={() => toggleSelectLog(log.id)}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {log.profiles?.last_name} {log.profiles?.first_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold">{log.profiles?.employee_code || '-'}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{log.work_date}</td>
                    <td className="py-3 px-4 font-medium text-slate-600">
                      {log.check_in ? new Date(log.check_in).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      <div className="text-[9px] text-slate-400">{log.check_in_ip}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-600">
                      {log.check_out ? new Date(log.check_out).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      <div className="text-[9px] text-slate-400">{log.check_out_ip}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        log.status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        log.status === 'late' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {attendanceStatusLabels[log.status] || log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(log)}
                          className="p-1.5 text-teal-600 hover:text-teal-800 rounded-md hover:bg-teal-50 transition-colors"
                          title="Sửa"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setActiveLog(log);
                            setShowDeleteConfirm(true);
                          }}
                          className="p-1.5 text-red-600 hover:text-red-800 rounded-md hover:bg-red-50 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                    Không có dữ liệu chấm công cho ngày này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Manual Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-md font-bold text-slate-800">Thêm Bù Công</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddManual} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nhân viên</label>
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employee_code} - {emp.last_name} {emp.first_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Ngày làm việc</label>
                <input
                  type="date"
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Giờ Check-in</label>
                  <input
                    type="time"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Giờ Check-out</label>
                  <input
                    type="time"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Trạng thái</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                >
                  <option value="present">Đúng giờ (Present)</option>
                  <option value="late">Đi trễ (Late)</option>
                  <option value="absent">Vắng mặt (Absent)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 min-h-[36px]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 min-h-[36px]"
                >
                  {formSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
                  Thêm dữ liệu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Manual Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-md font-bold text-slate-800">Chỉnh Sửa Chấm Công</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditManual} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Ngày làm việc</label>
                <input
                  type="date"
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Giờ Check-in</label>
                  <input
                    type="time"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Giờ Check-out</label>
                  <input
                    type="time"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Trạng thái</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-teal-700 min-h-[40px]"
                >
                  <option value="present">Đúng giờ (Present)</option>
                  <option value="late">Đi trễ (Late)</option>
                  <option value="absent">Vắng mặt (Absent)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 min-h-[36px]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 min-h-[36px]"
                >
                  {formSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Xóa dữ liệu?</h3>
            <p className="text-sm text-slate-500">
              {activeLog ? (
                <>Bạn có chắc chắn muốn xóa lượt chấm công của <strong className="text-slate-700">{activeLog.profiles?.last_name} {activeLog.profiles?.first_name}</strong> ngày {activeLog.work_date}?</>
              ) : (
                <>Bạn có chắc chắn muốn xóa <strong>{selectedLogIds.length}</strong> lượt chấm công đã chọn?</>
              )}
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setActiveLog(null);
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 min-h-[36px]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={formSubmitting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 min-h-[36px]"
              >
                {formSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
