'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useProfile } from '@/components/profile-provider';
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

  // 1. Tick Clock
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
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
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const now = new Date();

      // Automatically determine if the employee is late (Standard shift starts at 08:30 AM)
      const shiftStart = new Date();
      shiftStart.setHours(8, 30, 0, 0);
      const isLate = now > shiftStart;
      const calculatedStatus = isLate ? 'late' : 'present';

      const checkInLog = {
        employee_id: currentUser.id,
        work_date: todayStr,
        check_in: now.toISOString(),
        check_in_ip: '127.0.0.1', // Standard local IP mock
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
      alert(err.message || 'Check-in failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Check-Out Action
  const handleCheckOut = async () => {
    if (!currentUser || !todayLog) return;
    setSubmitting(true);
    try {
      const now = new Date();
      const updateData = {
        check_out: now.toISOString(),
        check_out_ip: '127.0.0.1',
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
      alert(err.message || 'Check-out failed. Please try again.');
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
        <h1 className="text-2xl font-bold text-slate-900">Attendance Chấm Công</h1>
        <p className="text-sm text-slate-500">Record daily check-in and check-out logs securely with IP logging.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Interactive Terminal */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Elite Star Terminal</span>
            
            {/* Elegant Real-Time Clock */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl py-8 px-4 flex flex-col items-center justify-center shadow-inner">
              <Clock className="h-8 w-8 text-teal-700 mb-2 animate-pulse" />
              <div className="text-3xl font-black text-slate-800 tracking-tight">{time || '--:--:--'}</div>
              <div className="text-xs text-slate-450 font-medium mt-1">{dateStr || '...'}</div>
            </div>
            
            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500">
              <MapPin className="h-3.5 w-3.5 text-teal-600" />
              <span>IP Logged Location: <span className="font-semibold text-slate-700">127.0.0.1 (Vietnam)</span></span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Check-in Notes (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional tasks details or message..."
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
                  className="w-full flex items-center justify-center gap-2 bg-teal-750 hover:bg-teal-800 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md shadow-teal-750/20 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Check In (Bắt Đầu Ca)
                </button>
              ) : !hasCheckedOut ? (
                <button
                  onClick={handleCheckOut}
                  disabled={loading || submitting}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md shadow-emerald-700/20 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  Check Out (Kết Thúc Ca)
                </button>
              ) : (
                <div className="w-full text-center py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-500">
                  Fully checked in and out for today. Good work!
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
                <span>Attendance Log Trail (Last 30 days)</span>
              </h2>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Shift: 08:30 AM
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Check In</th>
                    <th className="py-2.5 px-3">Check Out</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-650">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400 italic">Loading attendance list...</td>
                    </tr>
                  ) : history.length > 0 ? (
                    history.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{log.work_date}</td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {log.check_in ? new Date(log.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          <span className="text-[9px] text-slate-400 block">{log.check_in_ip}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {log.check_out ? new Date(log.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          {log.check_out_ip && <span className="text-[9px] text-slate-400 block">{log.check_out_ip}</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                            log.status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            log.status === 'late' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 italic">No attendance records registered.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
