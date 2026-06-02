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
  Users,
  Gift,
  Settings,
  Coins,
  CheckCircle2,
  AlertCircle,
  Eye,
  Printer,
  FileDown,
  Building,
  Briefcase,
  FileText
} from 'lucide-react';

// Helper to format currency
const formatVND = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

// Helper to format date as DD/MM/YYYY
const formatDateDMY = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

// Helper to get default payroll period
const getDefaultPayrollPeriod = () => {
  const date = new Date();
  const currentDay = date.getDate();
  const currentMonth = date.getMonth();
  const currentYear = date.getFullYear();
  
  let startMonth, startYear, endMonth, endYear;
  
  if (currentDay > 28) {
    startMonth = currentMonth;
    startYear = currentYear;
    endMonth = currentMonth + 1;
    endYear = currentYear;
    if (endMonth > 11) {
      endMonth = 0;
      endYear++;
    }
  } else {
    endMonth = currentMonth;
    endYear = currentYear;
    startMonth = currentMonth - 1;
    startYear = currentYear;
    if (startMonth < 0) {
      startMonth = 11;
      startYear--;
    }
  }
  
  const startStr = `${startYear}-${String(startMonth + 1).padStart(2, '0')}-28`;
  const endStr = `${endYear}-${String(endMonth + 1).padStart(2, '0')}-28`;
  return { startDate: startStr, endDate: endStr };
};

export default function PayrollPage() {
  const { profile: currentUser } = useProfile();
  const supabase = createClient();

  const defaultPeriod = getDefaultPayrollPeriod();
  const [startDate, setStartDate] = useState(defaultPeriod.startDate);
  const [endDate, setEndDate] = useState(defaultPeriod.endDate);
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [employeePayslips, setEmployeePayslips] = useState<any[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [salaryConfigModal, setSalaryConfigModal] = useState<{ isOpen: boolean; employee: any | null }>({ isOpen: false, employee: null });
  const [payslipModal, setPayslipModal] = useState<{ isOpen: boolean; employee: any | null }>({ isOpen: false, employee: null });

  // Inputs for Salary Configuration
  const [inputBasicSalary, setInputBasicSalary] = useState('');
  const [inputAllowance, setInputAllowance] = useState('');

  // Inputs for Chốt lương
  const [inputLateDeductions, setInputLateDeductions] = useState('0');
  const [inputOtherBonuses, setInputOtherBonuses] = useState('0');
  const [inputOtherDeductions, setInputOtherDeductions] = useState('0');
  const [inputPayslipNote, setInputPayslipNote] = useState('');
  const [inputPayslipStatus, setInputPayslipStatus] = useState<'draft' | 'published'>('draft');

  const isHrOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'hr';

  const fetchData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      
      if (isHrOrAdmin) {
        // 1. HR/Admin fetches all employees and payslips
        const { data: empData, error: empError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, employee_code, role, status, hire_date, basic_salary, allowance, departments(name), titles(name)')
          .eq('status', 'active')
          .order('last_name');
            
        if (empError) throw empError;
        setEmployees(empData || []);

        const { data: logsData, error: logsError } = await supabase
          .from('attendance_logs')
          .select('*')
          .gte('work_date', startDate)
          .lte('work_date', endDate);

        if (logsError) throw logsError;
        setLogs(logsData || []);

        const { data: payslipsData, error: payslipsError } = await supabase
          .from('payslips')
          .select('*')
          .eq('period_start', startDate)
          .eq('period_end', endDate);

        if (payslipsError) throw payslipsError;
        setPayslips(payslipsData || []);
      } else {
        // 2. Employee fetches own published payslips
        const { data: empPayslipsData, error: empPayslipsError } = await supabase
          .from('payslips')
          .select('*, profiles!payslips_employee_id_fkey(first_name, last_name, employee_code, departments(name), titles(name), hire_date)')
          .eq('employee_id', currentUser.id)
          .eq('status', 'published')
          .order('period_start', { ascending: false });

        if (empPayslipsError) throw empPayslipsError;
        setEmployeePayslips(empPayslipsData || []);
        
        if (empPayslipsData && empPayslipsData.length > 0 && !selectedPayslip) {
          setSelectedPayslip(empPayslipsData[0]);
        }
      }
    } catch (err: any) {
      toast.error('Lỗi khi tải dữ liệu lương');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser, startDate, endDate]);

  // Calculations for HR payroll workspace
  const payrollData = useMemo(() => {
    return employees.map(emp => {
      const empLogs = logs.filter(l => l.employee_id === emp.id);
      
      let totalValidDays = 0;
      let totalInvalidDays = 0;
      let totalHours = 0;

      empLogs.forEach(log => {
        if (log.status === 'absent' || log.status === 'on_leave') {
          totalInvalidDays += 1;
          return;
        }

        if (log.status === 'half_day') {
          totalValidDays += 0.5;
          totalInvalidDays += 0.5;
          if (log.check_in && log.check_out) {
            const checkIn = new Date(log.check_in);
            const checkOut = new Date(log.check_out);
            const diffHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
            totalHours += diffHours;
          }
          return;
        }

        // Must be 'present' or 'late'
        if (!log.check_in || !log.check_out) {
          // If check_in or check_out is missing, but status is present or late (manual entry), treat as valid full day
          totalValidDays += 1;
          return;
        }

        const checkIn = new Date(log.check_in);
        const checkOut = new Date(log.check_out);
        const diffHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
        
        if (diffHours < 7) {
          totalInvalidDays += 1;
        } else {
          totalValidDays += 1;
        }
        totalHours += diffHours;
      });

      const start = new Date(startDate);
      const end = new Date(endDate);
      const today = new Date();
      
      let totalDaysInPeriod = 0;
      let missingDates: Date[] = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dTime = d.getTime();
        const hireDate = emp.hire_date ? new Date(emp.hire_date).getTime() : 0;
        
        if (dTime > today.getTime() || dTime < hireDate) {
          continue; 
        }

        totalDaysInPeriod++;
        const dateStr = d.toISOString().split('T')[0];
        const logForDate = empLogs.find(l => l.work_date === dateStr);
        
        let isValid = false;
        if (logForDate) {
          if (logForDate.status === 'present' || logForDate.status === 'late') {
            if (logForDate.check_in && logForDate.check_out) {
              const checkIn = new Date(logForDate.check_in);
              const checkOut = new Date(logForDate.check_out);
              const diffHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
              if (diffHours >= 7) {
                isValid = true;
              }
            } else {
              // Manual entry with missing check_in/out but status is present/late
              isValid = true;
            }
          }
        }
        
        if (!isValid) {
          missingDates.push(new Date(d));
        }
      }
      
      const hasWeekendAbsence = missingDates.some(d => d.getDay() === 0 || d.getDay() === 6);
      let attendanceBonus = 0;
      if (missingDates.length <= 2 && !hasWeekendAbsence && totalDaysInPeriod > 0) {
        attendanceBonus = 500000;
      }

      // Check if payslip is already generated
      const existingPayslip = payslips.find(p => p.employee_id === emp.id);

      return {
        ...emp,
        totalValidDays,
        totalInvalidDays,
        totalHours: totalHours.toFixed(1),
        logCount: empLogs.length,
        totalDaysInPeriod,
        missingDaysCount: missingDates.length,
        attendanceBonus,
        existingPayslip
      };
    });
  }, [employees, logs, payslips, startDate, endDate]);

  const filteredPayroll = payrollData.filter((data) => {
    const fullName = `${data.last_name || ''} ${data.first_name || ''}`.toLowerCase();
    const code = (data.employee_code || '').toLowerCase();
    const searchLower = searchQuery.toLowerCase();
    return fullName.includes(searchLower) || code.includes(searchLower);
  });

  // Handle Salary Configuration Save
  const handleSaveSalaryConfig = async () => {
    const emp = salaryConfigModal.employee;
    if (!emp) return;

    try {
      const basic = parseFloat(inputBasicSalary) || 0;
      const allow = parseFloat(inputAllowance) || 0;

      const { error } = await supabase
        .from('profiles')
        .update({
          basic_salary: basic,
          allowance: allow
        })
        .eq('id', emp.id);

      if (error) throw error;

      // Log into Audit Logs
      await supabase.from('audit_logs').insert({
        actor_id: currentUser?.id,
        action: 'update_salary_config',
        table_name: 'profiles',
        record_id: emp.id,
        old_values: { basic_salary: emp.basic_salary, allowance: emp.allowance },
        new_values: { basic_salary: basic, allowance: allow }
      });

      toast.success(`Đã cập nhật lương cho ${emp.last_name} ${emp.first_name}`);
      setSalaryConfigModal({ isOpen: false, employee: null });
      fetchData();
    } catch (err: any) {
      toast.error('Lỗi khi lưu cấu hình lương');
      console.error(err);
    }
  };

  // Handle Generating Payslip Save
  const handleSavePayslip = async () => {
    const emp = payslipModal.employee;
    if (!emp) return;

    try {
      const late = parseFloat(inputLateDeductions) || 0;
      const otherB = parseFloat(inputOtherBonuses) || 0;
      const otherD = parseFloat(inputOtherDeductions) || 0;

      // Calculate basic scaled salary
      const standardDays = emp.totalDaysInPeriod || 22;
      const actualDays = emp.totalValidDays || 0;
      const baseSalary = emp.basic_salary || 0;
      const allowance = emp.allowance || 0;
      const attBonus = emp.attendanceBonus || 0;

      const scaledBase = standardDays > 0 ? (baseSalary * (actualDays / standardDays)) : 0;
      const netSalary = Math.max(0, scaledBase + allowance + attBonus + otherB - late - otherD);

      const payslipPayload = {
        employee_id: emp.id,
        period_start: startDate,
        period_end: endDate,
        standard_days: standardDays,
        actual_days: actualDays,
        basic_salary: baseSalary,
        allowance: allowance,
        attendance_bonus: attBonus,
        late_deductions: late,
        other_bonuses: otherB,
        other_deductions: otherD,
        net_salary: netSalary,
        status: inputPayslipStatus,
        note: inputPayslipNote,
        created_by: currentUser?.id
      };

      let error;
      let actionType = 'create_payslip';

      if (emp.existingPayslip) {
        actionType = 'update_payslip';
        const { error: updateError } = await supabase
          .from('payslips')
          .update(payslipPayload)
          .eq('id', emp.existingPayslip.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('payslips')
          .insert(payslipPayload);
        error = insertError;
      }

      if (error) throw error;

      // Audit logs
      await supabase.from('audit_logs').insert({
        actor_id: currentUser?.id,
        action: actionType,
        table_name: 'payslips',
        record_id: emp.id,
        old_values: emp.existingPayslip || null,
        new_values: payslipPayload
      });

      toast.success(inputPayslipStatus === 'published' ? 'Đã xuất bản phiếu lương!' : 'Đã lưu phiếu lương tạm thời.');
      setPayslipModal({ isOpen: false, employee: null });
      fetchData();
    } catch (err: any) {
      toast.error('Lỗi khi chốt phiếu lương');
      console.error(err);
    }
  };

  // Open Salary Config Modal
  const openSalaryConfig = (emp: any) => {
    setInputBasicSalary(String(emp.basic_salary || 0));
    setInputAllowance(String(emp.allowance || 0));
    setSalaryConfigModal({ isOpen: true, employee: emp });
  };

  // Open Payslip Modal
  const openPayslip = (emp: any) => {
    if (emp.existingPayslip) {
      setInputLateDeductions(String(emp.existingPayslip.late_deductions));
      setInputOtherBonuses(String(emp.existingPayslip.other_bonuses));
      setInputOtherDeductions(String(emp.existingPayslip.other_deductions));
      setInputPayslipNote(emp.existingPayslip.note || '');
      setInputPayslipStatus(emp.existingPayslip.status);
    } else {
      setInputLateDeductions('0');
      setInputOtherBonuses('0');
      setInputOtherDeductions('0');
      setInputPayslipNote('');
      setInputPayslipStatus('draft');
    }
    setPayslipModal({ isOpen: true, employee: emp });
  };

  // Live dynamic calculation for Payslip Modal
  const liveNetSalary = useMemo(() => {
    if (!payslipModal.employee) return 0;
    const emp = payslipModal.employee;
    const standardDays = emp.totalDaysInPeriod || 22;
    const actualDays = emp.totalValidDays || 0;
    const baseSalary = emp.basic_salary || 0;
    const allowance = emp.allowance || 0;
    const attBonus = emp.attendanceBonus || 0;

    const scaledBase = standardDays > 0 ? (baseSalary * (actualDays / standardDays)) : 0;
    
    const late = parseFloat(inputLateDeductions) || 0;
    const otherB = parseFloat(inputOtherBonuses) || 0;
    const otherD = parseFloat(inputOtherDeductions) || 0;

    return Math.max(0, scaledBase + allowance + attBonus + otherB - late - otherD);
  }, [payslipModal.employee, inputLateDeductions, inputOtherBonuses, inputOtherDeductions]);

  // Visual layout for PRINT
  const handlePrint = () => {
    window.print();
  };

  // ==========================================
  // RENDER INTERFACES BASED ON USER ROLE
  // ==========================================

  // 1. Employee view
  if (!isHrOrAdmin) {
    return (
      <div className="space-y-6">
        {/* Header Panel */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Coins className="h-6 w-6 text-teal-700" />
              Tra Cứu Lương Cá Nhân
            </h1>
            <p className="text-sm text-slate-500">Xem và lưu trữ phiếu lương chi tiết hàng tháng của bạn</p>
          </div>
          {selectedPayslip && (
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-colors min-h-[44px]"
            >
              <Printer className="h-4 w-4" />
              In Phiếu Lương
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-24 text-center text-slate-400 bg-white rounded-xl border border-slate-200 shadow-sm">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-3 text-teal-700" />
            Đang tải dữ liệu phiếu lương...
          </div>
        ) : employeePayslips.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: History list */}
            <div className="lg:col-span-4 space-y-3 print:hidden">
              <div className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">
                Lịch sử phiếu lương ({employeePayslips.length})
              </div>
              <div className="space-y-2">
                {employeePayslips.map((ps) => {
                  const isSelected = selectedPayslip?.id === ps.id;
                  return (
                    <button
                      key={ps.id}
                      onClick={() => setSelectedPayslip(ps)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex flex-col gap-2 ${
                        isSelected 
                          ? 'bg-teal-50 border-teal-300 shadow-sm ring-1 ring-teal-300' 
                          : 'bg-white border-slate-200 hover:border-slate-350 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-slate-800 text-sm">
                          Tháng {new Date(ps.period_end).getMonth() + 1}/{new Date(ps.period_end).getFullYear()}
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                          Đã phát hành
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        Chu kỳ: {ps.period_start} đến {ps.period_end}
                      </div>
                      <div className="text-sm font-black text-slate-900 border-t border-dashed border-slate-250 pt-1.5 mt-1">
                        {formatVND(ps.net_salary)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Premium Detailed Payslip Card */}
            <div className="lg:col-span-8 print:col-span-12">
              {selectedPayslip && (
                <div id="payslip-print-area" className="bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xl rounded-2xl p-6 sm:p-8 relative overflow-hidden print:border-none print:shadow-none print:p-0">
                  {/* Subtle Top Gradient decoration */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-700 print:hidden" />
                  
                  {/* Print only header */}
                  <div className="hidden print:block border-b border-slate-300 pb-4 mb-6">
                    <h2 className="text-lg font-black uppercase text-slate-800 tracking-wider">Khu phức hợp thể thao Elite Star</h2>
                    <p className="text-[10px] text-slate-500">Đường Nguyễn Văn Linh, Mỹ Xuyên, Long Xuyên, An Giang</p>
                  </div>

                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6 mb-6">
                    <div>
                      <span className="text-[9px] bg-teal-50 text-teal-800 border border-teal-200 uppercase font-black tracking-widest px-2.5 py-1 rounded-full print:hidden">
                        Phiếu Lương Chi Tiết
                      </span>
                      <h2 className="text-xl font-bold text-slate-900 mt-2">
                        PHIẾU LƯƠNG NHÂN SỰ
                      </h2>
                      <p className="text-xs text-slate-500 font-semibold mt-1">
                        Chu kỳ tính công: <span className="text-slate-800">{selectedPayslip.period_start}</span> đến <span className="text-slate-800">{selectedPayslip.period_end}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-slate-900 tracking-tight">
                        Tháng {new Date(selectedPayslip.period_end).getMonth() + 1}/{new Date(selectedPayslip.period_end).getFullYear()}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                        Mã phiếu: {selectedPayslip.id.substring(0, 8).toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* Staff Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-xs font-semibold">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Users className="h-4 w-4 text-teal-700" />
                        <span>Họ và tên:</span>
                        <strong className="text-slate-800 ml-auto">{selectedPayslip.profiles?.last_name} {selectedPayslip.profiles?.first_name}</strong>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        <Briefcase className="h-4 w-4 text-teal-700" />
                        <span>Mã nhân viên:</span>
                        <strong className="text-slate-800 ml-auto">{selectedPayslip.profiles?.employee_code || '-'}</strong>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        <Building className="h-4 w-4 text-teal-700" />
                        <span>Bộ phận/Phòng ban:</span>
                        <strong className="text-slate-800 ml-auto">{selectedPayslip.profiles?.departments?.name || '-'}</strong>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-500">
                        <FileText className="h-4 w-4 text-teal-700" />
                        <span>Chức danh:</span>
                        <strong className="text-slate-800 ml-auto">{selectedPayslip.profiles?.titles?.name || '-'}</strong>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        <CalendarRange className="h-4 w-4 text-teal-700" />
                        <span>Ngày công thực tế:</span>
                        <strong className="text-emerald-700 text-sm ml-auto">
                          {selectedPayslip.actual_days} / {selectedPayslip.standard_days} ngày
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Salary Breakdown (Grid: Earnings vs Deductions) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-200 pb-6 mb-6">
                    {/* Column 1: Earnings */}
                    <div className="space-y-3">
                      <h3 className="text-xs uppercase font-black text-teal-800 tracking-wider border-b border-teal-100 pb-2">
                        Các khoản thu nhập (Earnings)
                      </h3>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between font-medium text-slate-650">
                          <span>Lương cơ bản cấu hình:</span>
                          <span className="text-slate-500">{formatVND(selectedPayslip.basic_salary)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-800 border-b border-slate-100 pb-1.5">
                          <span>Lương CB theo ngày công:</span>
                          <span>
                            {formatVND(
                              selectedPayslip.standard_days > 0 
                                ? (selectedPayslip.basic_salary * (selectedPayslip.actual_days / selectedPayslip.standard_days)) 
                                : 0
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>Phụ cấp (cố định 100%):</span>
                          <span>{formatVND(selectedPayslip.allowance)}</span>
                        </div>
                        <div className="flex justify-between font-medium text-slate-650">
                          <span>Thưởng chuyên cần:</span>
                          <span className={selectedPayslip.attendance_bonus > 0 ? 'text-blue-600 font-bold' : ''}>
                            {formatVND(selectedPayslip.attendance_bonus)}
                          </span>
                        </div>
                        {selectedPayslip.other_bonuses > 0 && (
                          <div className="flex justify-between font-medium text-emerald-600 font-bold">
                            <span>Thưởng thêm khác:</span>
                            <span>+{formatVND(selectedPayslip.other_bonuses)}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between font-black text-slate-900 border-t border-slate-200 pt-2 text-sm bg-teal-50/30 p-2 rounded">
                          <span>Tổng thu nhập:</span>
                          <span className="text-teal-700">
                            {formatVND(
                              (selectedPayslip.standard_days > 0 
                                ? (selectedPayslip.basic_salary * (selectedPayslip.actual_days / selectedPayslip.standard_days)) 
                                : 0) +
                              selectedPayslip.allowance +
                              selectedPayslip.attendance_bonus +
                              selectedPayslip.other_bonuses
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Deductions */}
                    <div className="space-y-3">
                      <h3 className="text-xs uppercase font-black text-red-800 tracking-wider border-b border-red-100 pb-2">
                        Các khoản khấu trừ (Deductions)
                      </h3>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between font-medium text-slate-650">
                          <span>Phạt đi trễ / Kỷ luật:</span>
                          <span className={selectedPayslip.late_deductions > 0 ? 'text-red-600 font-bold' : ''}>
                            -{formatVND(selectedPayslip.late_deductions)}
                          </span>
                        </div>
                        <div className="flex justify-between font-medium text-slate-650">
                          <span>Các khoản giảm trừ khác:</span>
                          <span className={selectedPayslip.other_deductions > 0 ? 'text-red-600 font-bold' : ''}>
                            -{formatVND(selectedPayslip.other_deductions)}
                          </span>
                        </div>
                        
                        {/* Placeholder spacer */}
                        <div className="h-[44px] hidden sm:block"></div>

                        <div className="flex justify-between font-black text-slate-900 border-t border-slate-200 pt-2 text-sm bg-red-50/30 p-2 rounded">
                          <span>Tổng khấu trừ:</span>
                          <span className="text-red-700">
                            -{formatVND(selectedPayslip.late_deductions + selectedPayslip.other_deductions)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Net Salary Section */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-teal-800 text-white p-5 rounded-2xl shadow-md mb-6">
                    <div>
                      <div className="text-[10px] uppercase font-black tracking-widest text-teal-200">
                        Thực nhận chuyển khoản (Net Payout)
                      </div>
                      <div className="text-[11px] text-teal-100 font-semibold mt-1">
                        Đã được bộ phận Kế toán & HR phê duyệt
                      </div>
                    </div>
                    <div className="text-3xl font-black tracking-tight text-white">
                      {formatVND(selectedPayslip.net_salary)}
                    </div>
                  </div>

                  {/* Note Section */}
                  {selectedPayslip.note && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-semibold mb-6">
                      <span className="text-slate-400 uppercase font-black block tracking-wider mb-1">Ghi chú từ HR:</span>
                      <p className="text-slate-700 font-medium">{selectedPayslip.note}</p>
                    </div>
                  )}

                  {/* Signature Section */}
                  <div className="flex justify-between items-end pt-6 border-t border-dashed border-slate-250 text-xs font-bold">
                    <div className="text-slate-400">
                      <div>Ngày in: {new Date().toLocaleDateString('vi-VN')}</div>
                      <div className="text-[10px] font-medium mt-1">Elite Star HRM System v1.2</div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-400 font-medium mb-8">BAN GIÁM ĐỐC ELITE STAR</div>
                      <div className="text-teal-700 font-black flex items-center gap-1.5 justify-end">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>ĐÃ KÝ ĐIỆN TỬ</span>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
            
          </div>
        ) : (
          <div className="bg-white p-12 text-center text-slate-500 border border-slate-200 shadow-sm rounded-xl font-medium">
            <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-3" />
            Không có phiếu lương nào của bạn đã được xuất bản cho chu kỳ này.
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // 2. HR/ADMIN VIEW
  // ==========================================
  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="h-6 w-6 text-teal-700" />
            Chốt Công & Bảng Lương
          </h1>
          <p className="text-sm text-slate-500">Cấu hình lương, nhập thưởng phạt, và xuất bản phiếu lương nhân viên</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
          <CalendarRange className="h-4 w-4 text-slate-500 ml-1" />
          <input 
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-transparent border-none text-sm font-semibold focus:ring-0 w-[120px] text-slate-700 focus:outline-none"
          />
          <span className="text-slate-400 font-bold">-</span>
          <input 
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-transparent border-none text-sm font-semibold focus:ring-0 w-[120px] text-slate-700 focus:outline-none"
          />
        </div>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mã NV..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 w-full rounded-lg border border-slate-300 text-sm focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700 bg-white font-medium"
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
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Nhân sự chu kỳ</div>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">
              {payslips.filter(p => p.status === 'published').length} / {filteredPayroll.length}
            </div>
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Đã xuất bản phiếu lương</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="text-xs text-slate-500 uppercase font-bold mb-2 border-b border-slate-100 pb-2">Quy tắc tính công & Thưởng</div>
          <ul className="text-[11px] space-y-1 text-slate-650 font-medium">
            <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Dưới 7 tiếng = <b className="text-slate-800">0 công</b></li>
            <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Đủ 7 tiếng trở lên = <b className="text-slate-800">1 công</b></li>
            <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Thưởng chuyên cần: <b className="text-blue-700">500.000đ</b> (nghỉ &lt;= 2 ngày, không nghỉ T7/CN)</li>
          </ul>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs text-slate-650">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="py-4 px-4">Nhân viên</th>
                <th className="py-4 px-4 text-center">Công thực tế</th>
                <th className="py-4 px-4 text-right">Lương CB & PC</th>
                <th className="py-4 px-4 text-right bg-blue-50/30">Chuyên cần</th>
                <th className="py-4 px-4 text-center">Phiếu Lương</th>
                <th className="py-4 px-4 text-right bg-emerald-50/30 font-bold">Thực nhận</th>
                <th className="py-4 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-teal-700" />
                    Đang tính toán bảng công và lương nhân sự...
                  </td>
                </tr>
              ) : filteredPayroll.length > 0 ? (
                filteredPayroll.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/30 transition-colors">
                    {/* 1. Name & Code */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">
                        {emp.last_name} {emp.first_name}
                      </div>
                      <div className="text-[10px] text-slate-450 font-semibold">{emp.employee_code || '-'}</div>
                    </td>
                    
                    {/* 2. Actual Days */}
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                      {emp.totalValidDays} / {emp.totalDaysInPeriod}
                      {emp.missingDaysCount > 0 && (
                        <div className="text-[9px] text-red-500 font-semibold mt-0.5">Vắng {emp.missingDaysCount} ngày</div>
                      )}
                    </td>

                    {/* 3. Base salary & allowances */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-bold text-slate-800">{formatVND(emp.basic_salary)}</div>
                      <div className="text-[10px] text-slate-500">PC: {formatVND(emp.allowance)}</div>
                    </td>

                    {/* 4. Attendance Bonus */}
                    <td className="py-3.5 px-4 text-right bg-blue-50/20">
                      {emp.attendanceBonus > 0 ? (
                        <span className="text-blue-600 font-bold">+{formatVND(emp.attendanceBonus)}</span>
                      ) : (
                        <span className="text-slate-350">-</span>
                      )}
                    </td>

                    {/* 5. Payslip Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      {emp.existingPayslip ? (
                        emp.existingPayslip.status === 'published' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-250 font-bold px-2 py-0.5 rounded text-[10px]">
                            <CheckCircle2 className="h-3 w-3" />
                            Đã xuất bản
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-250 font-bold px-2 py-0.5 rounded text-[10px]">
                            <AlertCircle className="h-3 w-3" />
                            Bản nháp
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-500 border border-slate-200 font-bold px-2 py-0.5 rounded text-[10px]">
                          Chưa chốt
                        </span>
                      )}
                    </td>

                    {/* 6. Net salary received */}
                    <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm bg-emerald-50/20 border-l border-emerald-100">
                      {emp.existingPayslip ? (
                        <span className="text-emerald-700">{formatVND(emp.existingPayslip.net_salary)}</span>
                      ) : (
                        // Live calculate preview
                        <span className="text-slate-400 italic font-bold">
                          ~ {formatVND(
                            Math.max(0, 
                              (emp.totalDaysInPeriod > 0 ? (emp.basic_salary * (emp.totalValidDays / emp.totalDaysInPeriod)) : 0) +
                              emp.allowance + 
                              emp.attendanceBonus
                            )
                          )}
                        </span>
                      )}
                    </td>

                    {/* 7. Action buttons */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openSalaryConfig(emp)}
                          title="Cấu hình lương cơ bản & phụ cấp"
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded transition-colors"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openPayslip(emp)}
                          title={emp.existingPayslip ? 'Chỉnh sửa/Xem phiếu lương' : 'Chốt lương tháng này'}
                          className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded transition-colors ${
                            emp.existingPayslip
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              : 'bg-teal-700 text-white hover:bg-teal-800'
                          }`}
                        >
                          <Calculator className="h-3.5 w-3.5" />
                          <span>{emp.existingPayslip ? 'Sửa' : 'Chốt'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 italic">
                    Không tìm thấy nhân sự phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==========================================
          MODAL 1: SALARY CONFIGURATION
          ========================================== */}
      {salaryConfigModal.isOpen && salaryConfigModal.employee && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-md font-bold text-slate-800 flex items-center gap-1.5">
                <Settings className="h-5 w-5 text-teal-700" />
                Cấu Hình Lương Nhân Sự
              </h3>
              <button 
                onClick={() => setSalaryConfigModal({ isOpen: false, employee: null })} 
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                Đóng
              </button>
            </div>
            
            <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-150 text-xs">
              <div>Họ tên: <strong className="text-slate-800">{salaryConfigModal.employee.last_name} {salaryConfigModal.employee.first_name}</strong></div>
              <div>Mã NV: <strong className="text-slate-800">{salaryConfigModal.employee.employee_code || '-'}</strong></div>
              <div>Bộ phận: <strong className="text-slate-800">{salaryConfigModal.employee.departments?.name || '-'}</strong></div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Lương cơ bản (VND)</label>
                <input
                  type="number"
                  value={inputBasicSalary}
                  onChange={(e) => setInputBasicSalary(e.target.value)}
                  placeholder="Lương thỏa thuận hàng tháng..."
                  className="w-full rounded-lg border border-slate-350 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none bg-white font-medium text-slate-850"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Phụ cấp cố định (VND)</label>
                <input
                  type="number"
                  value={inputAllowance}
                  onChange={(e) => setInputAllowance(e.target.value)}
                  placeholder="Xăng xe, điện thoại, ăn trưa..."
                  className="w-full rounded-lg border border-slate-350 px-3 py-2 text-sm focus:border-teal-700 focus:outline-none bg-white font-medium text-slate-850"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                onClick={() => setSalaryConfigModal({ isOpen: false, employee: null })}
                className="px-3.5 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveSalaryConfig}
                className="px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 text-xs font-semibold shadow-sm transition-colors"
              >
                Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 2: GENERATE/CONFIRM PAYSLIP
          ========================================== */}
      {payslipModal.isOpen && payslipModal.employee && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-md font-bold text-slate-800 flex items-center gap-1.5">
                <Calculator className="h-5 w-5 text-teal-700" />
                {payslipModal.employee.existingPayslip ? 'Điều Chỉnh Phiếu Lương' : 'Chốt Phiếu Lương Tháng'}
              </h3>
              <button 
                onClick={() => setPayslipModal({ isOpen: false, employee: null })} 
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                Đóng
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-150 text-xs font-semibold">
              <div>
                Họ tên: <strong className="text-slate-800">{payslipModal.employee.last_name} {payslipModal.employee.first_name}</strong>
              </div>
              <div>
                Mã NV: <strong className="text-slate-800">{payslipModal.employee.employee_code || '-'}</strong>
              </div>
              <div>
                Công chuẩn: <strong className="text-slate-700">{payslipModal.employee.totalDaysInPeriod} ngày</strong>
              </div>
              <div className="col-span-2">
                Đi làm thực tế: <strong className="text-emerald-700 text-sm">{payslipModal.employee.totalValidDays} ngày</strong> <span className="text-slate-500 font-normal ml-1">(từ {formatDateDMY(startDate)} đến {formatDateDMY(endDate)})</span>
              </div>
            </div>

            {/* Calculations Breakdown (Read-Only Preview) */}
            <div className="bg-teal-50/30 p-3 rounded-lg border border-teal-100 text-xs font-medium space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Lương CB tính theo công thực tế:</span>
                <span className="font-bold text-slate-800">
                  {formatVND(
                    payslipModal.employee.totalDaysInPeriod > 0 
                      ? (payslipModal.employee.basic_salary * (payslipModal.employee.totalValidDays / payslipModal.employee.totalDaysInPeriod)) 
                      : 0
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phụ cấp cố định:</span>
                <span className="font-bold text-slate-800">{formatVND(payslipModal.employee.allowance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Thưởng chuyên cần tự động:</span>
                <span className="font-bold text-blue-600">+{formatVND(payslipModal.employee.attendanceBonus)}</span>
              </div>
            </div>

            {/* Editable Fields for HR */}
            <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-500 uppercase mb-1">Khấu trừ đi trễ (VND)</label>
                <input
                  type="number"
                  value={inputLateDeductions}
                  onChange={(e) => setInputLateDeductions(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-teal-700 focus:outline-none bg-white text-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-500 uppercase mb-1">Thưởng thêm khác (VND)</label>
                <input
                  type="number"
                  value={inputOtherBonuses}
                  onChange={(e) => setInputOtherBonuses(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-teal-700 focus:outline-none bg-white text-slate-800 font-bold"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-500 uppercase mb-1">Khấu trừ kỷ luật / Khác (VND)</label>
                <input
                  type="number"
                  value={inputOtherDeductions}
                  onChange={(e) => setInputOtherDeductions(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-teal-700 focus:outline-none bg-white text-slate-800 font-bold"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-500 uppercase mb-1">Ghi chú phiếu lương</label>
                <textarea
                  rows={2}
                  value={inputPayslipNote}
                  onChange={(e) => setInputPayslipNote(e.target.value)}
                  placeholder="Ghi rõ lý do thưởng dự án, lý do phạt (nếu có)..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-teal-700 focus:outline-none bg-white text-slate-700"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-500 uppercase mb-1">Trạng thái phát hành</label>
                <select
                  value={inputPayslipStatus}
                  onChange={(e) => setInputPayslipStatus(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-teal-700 focus:outline-none bg-white text-slate-800 font-bold cursor-pointer"
                >
                  <option value="draft">Lưu nháp (Draft) - Chỉ HR/Admin nhìn thấy</option>
                  <option value="published">Xuất bản (Published) - Gửi đến nhân viên ngay</option>
                </select>
              </div>
            </div>

            {/* Live Net Salary Preview */}
            <div className="bg-teal-800 text-white p-4 rounded-xl flex items-center justify-between shadow-sm">
              <div>
                <div className="text-[10px] uppercase font-bold text-teal-200">Tổng lương thực nhận (Net Salary)</div>
                <div className="text-[10px] text-teal-100 mt-0.5">Sau khi áp dụng thưởng phạt</div>
              </div>
              <div className="text-xl font-black">{formatVND(liveNetSalary)}</div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                onClick={() => setPayslipModal({ isOpen: false, employee: null })}
                className="px-3.5 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={handleSavePayslip}
                className="px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 text-xs font-semibold shadow-sm transition-colors"
              >
                {payslipModal.employee.existingPayslip ? 'Cập nhật phiếu lương' : 'Chốt & Lưu Phiếu'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Global Print-only CSS layout */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #payslip-print-area, #payslip-print-area * {
            visibility: visible;
          }
          #payslip-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
          .print\:hidden {
            display: none !important;
          }
          .print\:block {
            display: block !important;
          }
        }
      `}</style>

    </div>
  );
}
