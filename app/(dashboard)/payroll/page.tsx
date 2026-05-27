'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useProfile } from '@/components/profile-provider';
import { toast } from 'sonner';
import { 
  Calculator, 
  CalendarRange, 
  Download, 
  Loader2, 
  Search,
  Users
} from 'lucide-react';

export default function PayrollPage() {
  const { profile: currentUser } = useProfile();
  const supabase = createClient();

  // Chu kỳ đặc biệt tháng đầu: 28/04 -> 31/05
  // Nếu là năm khác, ta có thể set động, nhưng ở đây set cố định năm 2024 làm ví dụ hoặc lấy năm hiện tại.
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-04-28`);
  const [endDate, setEndDate] = useState(`${currentYear}-05-31`);
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const isHrOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'hr';

  const fetchData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      
      // Lấy danh sách nhân viên
      const { data: empData, error: empError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, employee_code, departments(name), roles:role(name)')
        .order('last_name');
        
      if (empError) throw empError;
      setEmployees(empData || []);

      // Lấy danh sách chấm công trong khoảng thời gian
      const { data: logsData, error: logsError } = await supabase
        .from('attendance_logs')
        .select('*')
        .gte('work_date', startDate)
        .lte('work_date', endDate);

      if (logsError) throw logsError;
      setLogs(logsData || []);
    } catch (err: any) {
      toast.error('Lỗi khi tải dữ liệu chốt công');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser, startDate, endDate]);

  // Xử lý tính toán công
  const payrollData = useMemo(() => {
    return employees.map(emp => {
      // Lọc các lượt chấm công của nhân viên này
      const empLogs = logs.filter(l => l.employee_id === emp.id);
      
      let totalValidDays = 0;
      let totalInvalidDays = 0;
      let totalHours = 0;

      const dailyDetails = empLogs.map(log => {
        if (!log.check_in || !log.check_out) {
          totalInvalidDays += 1;
          return { ...log, workedHours: 0, validDay: 0 };
        }

        const checkIn = new Date(log.check_in);
        const checkOut = new Date(log.check_out);
        const diffMs = checkOut.getTime() - checkIn.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        
        let validDay = 0;
        // Quy tắc tính công:
        // < 2 tiếng = 0 công
        // >= 2 tiếng & < 6 tiếng = 0.5 công
        // >= 6 tiếng = 1 công
        if (diffHours < 2) {
          validDay = 0;
          totalInvalidDays += 1;
        } else if (diffHours < 6) {
          validDay = 0.5;
          totalValidDays += 0.5;
        } else {
          validDay = 1;
          totalValidDays += 1;
        }

        totalHours += diffHours;

        return { ...log, workedHours: diffHours, validDay };
      });

      return {
        ...emp,
        totalValidDays,
        totalInvalidDays,
        totalHours: totalHours.toFixed(1),
        logCount: empLogs.length,
        dailyDetails
      };
    });
  }, [employees, logs]);

  const filteredPayroll = payrollData.filter((data) => {
    const fullName = `${data.last_name || ''} ${data.first_name || ''}`.toLowerCase();
    const code = (data.employee_code || '').toLowerCase();
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
          <h1 className="text-2xl font-bold text-slate-900">Chốt Công & Bảng Lương</h1>
          <p className="text-sm text-slate-500">Tổng hợp ngày công thực tế của nhân sự</p>
        </div>
        <button
          onClick={() => {
            toast.success('Tính năng xuất Excel đang được phát triển');
          }}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-colors min-h-[44px]"
        >
          <Download className="h-4 w-4" />
          Xuất Báo Cáo
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
          <CalendarRange className="h-4 w-4 text-slate-500 ml-1" />
          <input 
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-transparent border-none text-sm font-medium focus:ring-0 w-[120px] text-slate-700"
          />
          <span className="text-slate-400 font-bold">-</span>
          <input 
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-transparent border-none text-sm font-medium focus:ring-0 w-[120px] text-slate-700"
          />
        </div>

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
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{filteredPayroll.length}</div>
            <div className="text-xs text-slate-500 uppercase font-semibold">Nhân sự có dữ liệu</div>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Calculator className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">
              {filteredPayroll.reduce((acc, curr) => acc + curr.totalValidDays, 0)}
            </div>
            <div className="text-xs text-slate-500 uppercase font-semibold">Tổng số công hợp lệ</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="text-xs text-slate-500 uppercase font-bold mb-2 border-b border-slate-100 pb-2">Quy tắc tính công hiện tại</div>
          <ul className="text-[11px] space-y-1 text-slate-600 font-medium">
            <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> Dưới 2 tiếng = <b className="text-slate-800">0 công</b> (Không hợp lệ)</li>
            <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500"></span> 2 - 6 tiếng = <b className="text-slate-800">0.5 công</b></li>
            <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Trên 6 tiếng = <b className="text-slate-800">1 công</b></li>
          </ul>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs text-slate-650">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="py-4 px-4">Nhân viên</th>
                <th className="py-4 px-4">Phòng ban</th>
                <th className="py-4 px-4 text-center">Tổng lượt chấm</th>
                <th className="py-4 px-4 text-center">Giờ làm (Tích lũy)</th>
                <th className="py-4 px-4 text-center">Lượt không hợp lệ (< 2h)</th>
                <th className="py-4 px-4 text-center text-emerald-700 font-bold bg-emerald-50/50">Ngày công hợp lệ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-teal-700" />
                    Đang tính toán dữ liệu chốt công...
                  </td>
                </tr>
              ) : filteredPayroll.length > 0 ? (
                filteredPayroll.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-sm">
                        {emp.last_name} {emp.first_name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">{emp.employee_code || '-'}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {emp.departments?.name || '-'}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-700">
                      {emp.logCount}
                    </td>
                    <td className="py-3 px-4 text-center font-medium">
                      {emp.totalHours} <span className="text-[10px] text-slate-400">giờ</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {emp.totalInvalidDays > 0 ? (
                        <span className="inline-flex items-center justify-center bg-red-100 text-red-700 font-bold w-6 h-6 rounded-full text-[11px]">
                          {emp.totalInvalidDays}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-black text-emerald-700 text-base bg-emerald-50/30">
                      {emp.totalValidDays}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 italic">
                    Không tìm thấy dữ liệu chốt công.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
