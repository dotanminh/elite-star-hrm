import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { 
  dashboard as dbText, 
  leaveTypeLabels, 
  attendanceStatusLabels 
} from '@/lib/i18n/vi';
import DashboardContent from '@/components/dashboard-content';

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
    .select('*, profiles!leave_requests_employee_id_fkey(first_name, last_name, email)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5);

  // 7. Fetch all active employees for statistics
  const { data: allEmployees } = await supabase
    .from('profiles')
    .select('gender, education_level')
    .eq('status', 'active');
    
  let maleCount = 0;
  let femaleCount = 0;
  const educationStats: Record<string, number> = {};

  if (allEmployees) {
    allEmployees.forEach(emp => {
      if (emp.gender === 'male') maleCount++;
      else if (emp.gender === 'female') femaleCount++;
      
      const edu = emp.education_level || 'Chưa cập nhật';
      educationStats[edu] = (educationStats[edu] || 0) + 1;
    });
  }

  // 8. Fetch recent disciplinary records
  const { data: recentDisciplines } = await supabase
    .from('disciplinary_records')
    .select('*, profiles!disciplinary_records_employee_id_fkey(first_name, last_name, employee_code)')
    .order('record_date', { ascending: false })
    .limit(5);

  // 9. Fetch last 7 days attendance stats for Live Chart
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const startDateStr = sevenDaysAgo.toISOString().split('T')[0];

  const { data: weeklyLogs } = await supabase
    .from('attendance_logs')
    .select('work_date, status')
    .gte('work_date', startDateStr)
    .lte('work_date', todayStr);

  const weeklyAttendance = [];
  // Build array for last 7 days
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const logsForDate = weeklyLogs?.filter(l => l.work_date === dateStr) || [];
    const presentCount = logsForDate.filter(l => l.status === 'present' || l.status === 'late').length;
    
    // Format date nicely (e.g. 28/05)
    const [year, month, day] = dateStr.split('-');
    
    weeklyAttendance.push({
      date: `${day}/${month}`,
      present: presentCount
    });
  }

  return (
    <DashboardContent
      totalActive={totalActive}
      totalOnLeave={totalOnLeave}
      totalCheckedIn={totalCheckedIn}
      attendanceRate={attendanceRate}
      recentLogs={recentLogs || []}
      pendingLeaves={pendingLeaves || []}
      maleCount={maleCount}
      femaleCount={femaleCount}
      educationStats={educationStats}
      recentDisciplines={recentDisciplines || []}
      weeklyAttendance={weeklyAttendance}
      dbText={dbText}
      leaveTypeLabels={leaveTypeLabels}
      attendanceStatusLabels={attendanceStatusLabels}
    />
  );
}
