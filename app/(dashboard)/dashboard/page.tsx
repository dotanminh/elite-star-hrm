import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { 
  Users, 
  CalendarRange, 
  CheckCircle, 
  Clock, 
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createClient();
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Fetch total active employees
  const { count: totalActiveCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  const totalActive = totalActiveCount || 0;

  // 2. Fetch on-leave employees today
  const { count: totalOnLeaveCount } = await supabase
    .from('leave_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')
    .lte('start_date', todayStr)
    .gte('end_date', todayStr);

  const totalOnLeave = totalOnLeaveCount || 0;

  // 3. Fetch attendance today
  const { count: totalCheckedInCount } = await supabase
    .from('attendance_logs')
    .select('*', { count: 'exact', head: true })
    .eq('work_date', todayStr);

  const totalCheckedIn = totalCheckedInCount || 0;

  // 4. Calculate attendance rate
  const attendanceRate = totalActive > 0 ? Math.round((totalCheckedIn / totalActive) * 100) : 0;

  // 5. Fetch recent activity (logs or check-ins)
  const { data: recentLogs } = await supabase
    .from('attendance_logs')
    .select('*, profiles(first_name, last_name, email)')
    .order('updated_at', { ascending: false })
    .limit(5);

  // 6. Fetch pending leave requests
  const { data: pendingLeaves } = await supabase
    .from('leave_requests')
    .select('*, profiles(first_name, last_name, email)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="text-sm text-slate-500">Real-time indicators and operational metrics for Elite Star complex.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric Card: Active Employees */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Active Roster</span>
            <span className="text-2xl font-bold text-slate-800 block mt-1">{totalActive}</span>
            <span className="text-xs text-teal-600 font-medium flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" /> Fully functional
            </span>
          </div>
          <div className="bg-teal-50 p-3 rounded-lg text-teal-700">
            <Users className="h-6 w-6" />
          </div>
        </div>

        {/* Metric Card: Checked In Today */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Checked In Today</span>
            <span className="text-2xl font-bold text-slate-800 block mt-1">{totalCheckedIn}</span>
            <span className="text-xs text-slate-500 font-medium block mt-1">On duty at complex</span>
          </div>
          <div className="bg-emerald-50 p-3 rounded-lg text-emerald-700">
            <CheckCircle className="h-6 w-6" />
          </div>
        </div>

        {/* Metric Card: On Leave Today */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">On Leave Today</span>
            <span className="text-2xl font-bold text-slate-800 block mt-1">{totalOnLeave}</span>
            <span className="text-xs text-amber-600 font-medium block mt-1">Approved absences</span>
          </div>
          <div className="bg-amber-50 p-3 rounded-lg text-amber-700">
            <CalendarRange className="h-6 w-6" />
          </div>
        </div>

        {/* Metric Card: Attendance Rate */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Attendance Rate</span>
            <span className="text-2xl font-bold text-slate-800 block mt-1">{attendanceRate}%</span>
            <span className="text-xs text-slate-500 font-medium block mt-1">Of active roster</span>
          </div>
          <div className="bg-indigo-50 p-3 rounded-lg text-indigo-700">
            <Clock className="h-6 w-6" />
          </div>
        </div>

      </div>

      {/* Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Real-Time Check-In logs */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-md font-bold text-slate-800">Recent Attendance Logs</h2>
            <Link href="/attendance" className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1">
              Verify Check-ins <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                  <th className="py-2.5 px-3 rounded-l-lg font-semibold">Employee</th>
                  <th className="py-2.5 px-3 font-semibold">Check In</th>
                  <th className="py-2.5 px-3 font-semibold">Check Out</th>
                  <th className="py-2.5 px-3 rounded-r-lg font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentLogs && recentLogs.length > 0 ? (
                  recentLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">
                          {log.profiles?.first_name} {log.profiles?.last_name}
                        </div>
                        <div className="text-[10px] text-slate-400">{log.profiles?.email}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-medium">
                        {log.check_in ? new Date(log.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-medium">
                        {log.check_out ? new Date(log.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
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
                    <td colSpan={4} className="py-6 text-center text-slate-400 italic">No attendance logged today yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Column: Leave Queue Widget */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-md font-bold text-slate-800">Pending Approvals</h2>
            <Link href="/leave" className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1">
              Queue <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {pendingLeaves && pendingLeaves.length > 0 ? (
              pendingLeaves.map((leave: any) => (
                <div key={leave.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-slate-850 text-xs truncate max-w-[120px]">
                      {leave.profiles?.first_name} {leave.profiles?.last_name}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200">
                      {leave.leave_type}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-450 font-medium">
                    {leave.start_date} to {leave.end_date}
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1 italic mt-1">&quot;{leave.reason}&quot;</p>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 italic text-xs">
                No pending requests. Excellent!
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
