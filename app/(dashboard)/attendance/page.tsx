'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useProfile } from '@/components/profile-provider';
import { 
  attendance as attText, 
  attendanceStatusLabels, 
  common 
} from '@/lib/i18n/vi';
import { 
  Clock, 
  MapPin, 
  CheckCircle, 
  LogOut, 
  History, 
  Loader2 
} from 'lucide-react';

export default function AttendancePage() {
  const { profile: currentUser } = useProfile();
  const supabase = createClient();

  const [time, setTime] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [todayLog, setTodayLog] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [clientIp, setClientIp] = useState('127.0.0.1');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Get true IP on load
  useEffect(() => {
    const detectIp = async () => {
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        if (data?.ip) {
          setClientIp(data.ip);
        }
      } catch (err) {
        console.error('IP detection fallback:', err);
      }
    };
    detectIp();
  }, []);

  // 1. Tick Clock
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 2. Fetch data
  const fetchAttendance = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const todayStr = new Date().toISOString().split('T')[0];

      // Fetch today's log
      const { data: todayData } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('employee_id', currentUser.id)
        .eq('work_date', todayStr)
        .maybeSingle();
      
      setTodayLog(todayData);

      // Fetch history
      const { data: histData } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('employee_id', currentUser.id)
        .order('work_date', { ascending: false })
        .limit(30);

      setHistory(histData || []);
    } catch (err) {
      console.error('Error fetching attendance logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchAttendance();
    }
  }, [currentUser]);

  // 3. Check-In Action
  const handleCheckIn = async () => {
    if (!currentUser) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const now = new Date();

      // Determine late based on shift starting at 06:00
      const shiftStart = new Date();
      shiftStart.setHours(6, 0, 0, 0);
      const isLate = now > shiftStart;
      const calculatedStatus = isLate ? 'late' : 'present';

      const checkInLog = {
        employee_id: currentUser.id,
        work_date: todayStr,
        check_in: now.toISOString(),
        check_in_ip: clientIp,
        status: calculatedStatus
      };

      const { data, error } = await supabase
        .from('attendance_logs')
        .insert(checkInLog)
        .select()
        .single();

      if (error) throw error;

      // Write into Audit Logs
      await supabase.from('audit_logs').insert({
        actor_id: currentUser.id,
        action: 'check_in',
        table_name: 'attendance_logs',
        record_id: data.id,
        new_values: { ...checkInLog, notes }
      });

      setNotes('');
      fetchAttendance();
    } catch (err: any) {
      setErrorMsg(err.message || attText.errors.checkInFailed);
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Check-Out Action
  const handleCheckOut = async () => {
    if (!currentUser || !todayLog) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const now = new Date();
      const updateData = {
        check_out: now.toISOString(),
        check_out_ip: clientIp,
      };

      const { error } = await supabase
        .from('attendance_logs')
        .update(updateData)
        .eq('id', todayLog.id);

      if (error) throw error;

      // Write into Audit Logs
      await supabase.from('audit_logs').insert({
        actor_id: currentUser.id,
        action: 'check_out',
        table_name: 'attendance_logs',
        record_id: todayLog.id,
        old_values: { check_in: todayLog.check_in },
        new_values: updateData
      });

      setNotes('');
      fetchAttendance();
    } catch (err: any) {
      setErrorMsg(err.message || attText.errors.checkOutFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const hasCheckedIn = !!todayLog?.check_in;
  const hasCheckedOut = !!todayLog?.check_out;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{attText.title}</h1>
        <p className="text-sm text-slate-500">{attText.subtitle}</p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-semibold shadow-sm">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Interactive Terminal */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{attText.terminal}</span>
            
            {/* Elegant Real-Time Clock */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl py-8 px-4 flex flex-col items-center justify-center shadow-inner">
              <Clock className="h-8 w-8 text-teal-700 mb-2 animate-pulse" />
              <div className="text-3xl font-black text-slate-800 tracking-tight">{time || '--:--:--'}</div>
              <div className="text-xs text-slate-450 font-medium mt-1 capitalize">{dateStr || '...'}</div>
            </div>
            
            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500">
              <MapPin className="h-3.5 w-3.5 text-teal-600" />
              <span>{attText.ipLogged} <span className="font-semibold text-slate-700">{clientIp}</span></span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{attText.notesLabel}</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={attText.notesPlaceholder}
                disabled={hasCheckedOut}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-teal-700 placeholder-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Check-In/Out Primary Action Buttons */}
            <div className="flex flex-col gap-2">
              
              {!hasCheckedIn ? (
                <button
                  onClick={handleCheckIn}
                  disabled={loading || submitting}
                  className="w-full flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md shadow-teal-700/20 disabled:opacity-50 min-h-[48px]"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  {attText.checkInBtn}
                </button>
              ) : !hasCheckedOut ? (
                <button
                  onClick={handleCheckOut}
                  disabled={loading || submitting}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md shadow-emerald-700/20 disabled:opacity-50 min-h-[48px]"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  {attText.checkOutBtn}
                </button>
              ) : (
                <div className="w-full text-center py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-500">
                  {attText.doneMessage}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Right 2 Columns: Timecard Ledger Trail */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
                <History className="h-4 w-4 text-slate-400" />
                <span>{attText.logTrail}</span>
              </h2>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {attText.shiftStart}
              </span>
            </div>

            {/* Desktop View Table (>= 640px) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-3">{attText.date}</th>
                    <th className="py-2.5 px-3">{attText.checkIn}</th>
                    <th className="py-2.5 px-3">{attText.checkOut}</th>
                    <th className="py-2.5 px-3">{attText.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-650">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400 italic">{attText.loadingList}</td>
                    </tr>
                  ) : history.length > 0 ? (
                    history.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{log.work_date}</td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {log.check_in ? new Date(log.check_in).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          <span className="text-[9px] text-slate-400 block">{log.check_in_ip}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {log.check_out ? new Date(log.check_out).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          {log.check_out_ip && <span className="text-[9px] text-slate-400 block">{log.check_out_ip}</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                            log.status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            log.status === 'late' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {attendanceStatusLabels[log.status] || log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 italic">{attText.noRecords}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View Cards (< 640px) */}
            <div className="block sm:hidden space-y-3">
              {loading ? (
                <div className="py-6 text-center text-slate-400 italic">{attText.loadingList}</div>
              ) : history.length > 0 ? (
                history.map((log) => (
                  <div key={log.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="font-bold text-slate-800">{log.work_date}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                        log.status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        log.status === 'late' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {attendanceStatusLabels[log.status] || log.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-650">
                      <div>
                        <span className="text-[10px] text-slate-400 block">{attText.checkIn}</span>
                        <span className="font-medium text-slate-800">
                          {log.check_in ? new Date(log.check_in).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </span>
                        {log.check_in_ip && <span className="text-[9px] text-slate-400 block truncate">{log.check_in_ip}</span>}
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">{attText.checkOut}</span>
                        <span className="font-medium text-slate-800">
                          {log.check_out ? new Date(log.check_out).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </span>
                        {log.check_out_ip && <span className="text-[9px] text-slate-400 block truncate">{log.check_out_ip}</span>}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 italic">{attText.noRecords}</div>
              )}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
