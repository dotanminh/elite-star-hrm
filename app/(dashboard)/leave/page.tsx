'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useProfile } from '@/components/profile-provider';
import { 
  Calendar, 
  Send, 
  Check, 
  X, 
  Loader2, 
  MessageSquare 
} from 'lucide-react';

export default function LeavePage() {
  const { profile: currentUser } = useProfile();
  const supabase = createClient();

  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [approvalQueue, setApprovalQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [leaveType, setLeaveType] = useState<'annual' | 'sick' | 'unpaid' | 'maternity' | 'other'>('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Action states
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [managerComment, setManagerComment] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);

  const isEmployeeOrManager = currentUser?.role === 'employee' || currentUser?.role === 'manager';
  const isApprover = currentUser?.role === 'admin' || currentUser?.role === 'hr' || currentUser?.role === 'manager';

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch own requests
      const { data: ownData } = await supabase
        .from('leave_requests')
        .select('*, approved_by_profile:profiles!leave_requests_approved_by_fkey(first_name, last_name)')
        .eq('employee_id', currentUser?.id)
        .order('created_at', { ascending: false });
      setMyLeaves(ownData || []);

      // 2. Fetch approval queue for HR/Admin/Manager
      if (isApprover) {
        let queueQuery = supabase
          .from('leave_requests')
          .select('*, employee_profile:profiles!leave_requests_employee_id_fkey(first_name, last_name, email, department_id)')
          .order('created_at', { ascending: false });

        if (currentUser?.role === 'manager' && currentUser.department_id) {
          // Managers only approve their department
          // Note: RLS does this, but we filter in UI to matches too
          // RLS matches: public.get_user_department(employee_id) = public.get_user_department(auth.uid())
        }

        const { data: queueData } = await queueQuery;
        
        // Filter queue based on department for manager, or just keep active pending for others
        const filteredQueue = (queueData || []).filter((req: any) => {
          if (currentUser?.role === 'manager') {
            return req.employee_profile?.department_id === currentUser.department_id;
          }
          return true; // HR/Admin sees all
        });

        setApprovalQueue(filteredQueue);
      }
    } catch (err) {
      console.error('Error fetching leave details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  // Request Submission
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!startDate || !endDate || !reason) {
      setFormError('Please fill out all fields');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setFormError('End date must be on or after start date');
      return;
    }

    setFormSubmitting(true);
    try {
      const newRequest = {
        employee_id: currentUser?.id,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason,
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('leave_requests')
        .insert(newRequest)
        .select()
        .single();

      if (error) throw error;

      // Log in system audits
      await supabase.from('audit_logs').insert({
        actor_id: currentUser?.id,
        action: 'submit_leave_request',
        table_name: 'leave_requests',
        record_id: data.id,
        new_values: newRequest
      });

      setFormSuccess('Leave request submitted successfully');
      setStartDate('');
      setEndDate('');
      setReason('');
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred during submission');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Leave Approval/Rejection Actions
  const handleDecideLeave = async (id: string, decision: 'approved' | 'rejected') => {
    setCommentError(null);
    try {
      const targetReq = approvalQueue.find(r => r.id === id);
      if (!targetReq) return;

      const updateFields = {
        status: decision,
        approved_by: currentUser?.id,
        approved_at: new Date().toISOString(),
        manager_comment: managerComment || null
      };

      const { error } = await supabase
        .from('leave_requests')
        .update(updateFields)
        .eq('id', id);

      if (error) throw error;

      // Log in system audits
      await supabase.from('audit_logs').insert({
        actor_id: currentUser?.id,
        action: `${decision}_leave_request`,
        table_name: 'leave_requests',
        record_id: id,
        old_values: { status: targetReq.status },
        new_values: updateFields
      });

      setActiveActionId(null);
      setManagerComment('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to complete approval decision');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Leave Management</h1>
        <p className="text-sm text-slate-500">Request time off or manage active departmental approvals.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Submit Request Form */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 h-fit">
          <h2 className="text-md font-bold text-slate-800 border-b border-slate-100 pb-2">Submit Leave Request</h2>
          
          <form onSubmit={handleSubmitRequest} className="space-y-4">
            {formSuccess && (
              <div className="p-3 bg-teal-50 border border-teal-100 rounded-lg text-xs text-teal-700">
                {formSuccess}
              </div>
            )}
            {formError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Leave Type</label>
              <select
                value={leaveType}
                onChange={(e: any) => setLeaveType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-teal-705 focus:border-teal-700"
              >
                <option value="annual">Annual Leave (Phep Nam)</option>
                <option value="sick">Sick Leave (Phep Benh)</option>
                <option value="unpaid">Unpaid Leave (Nghi Khong Luong)</option>
                <option value="maternity">Maternity Leave (Thai San)</option>
                <option value="other">Other Absences</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-teal-705 focus:border-teal-700"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-teal-705 focus:border-teal-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Reason Description</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-teal-705 focus:border-teal-700 placeholder-slate-400"
                placeholder="Describe your reasoning briefly (e.g. medical appointment, travel, personal rest)..."
              />
            </div>

            <button
              type="submit"
              disabled={formSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 text-white py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {formSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit Request
            </button>
          </form>
        </div>

        {/* Center & Right Column: Own List and Department Approvals */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section: Approval Queue (Only for Managers / HR / Admin) */}
          {isApprover && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-md font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                <span>Absence Approval Queue</span>
                <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                  {approvalQueue.filter(r => r.status === 'pending').length} Pending
                </span>
              </h2>

              <div className="space-y-3">
                {approvalQueue.length > 0 ? (
                  approvalQueue.map((req) => (
                    <div key={req.id} className="p-4 bg-slate-50 rounded-xl border border-slate-150 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-800 block text-xs">
                            {req.employee_profile?.first_name} {req.employee_profile?.last_name}
                          </span>
                          <span className="text-[10px] text-slate-400 block">{req.employee_profile?.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-slate-200 text-slate-700 rounded border border-slate-300">
                            {req.leave_type}
                          </span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                            req.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            req.status === 'approved' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-1">
                        <p className="flex items-center gap-1 font-medium text-slate-500">
                          <Calendar className="h-3 w-3" /> Duration: {req.start_date} to {req.end_date}
                        </p>
                        <p className="italic text-slate-700 bg-white p-2 rounded-lg border border-slate-100">&quot;{req.reason}&quot;</p>
                        {req.manager_comment && (
                          <p className="text-[10px] text-slate-450 flex items-center gap-1 mt-1">
                            <MessageSquare className="h-3 w-3 text-slate-400" /> Response: {req.manager_comment}
                          </p>
                        )}
                      </div>

                      {req.status === 'pending' && (
                        <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                          {activeActionId === req.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                placeholder="Add manager comment / feedback..."
                                value={managerComment}
                                onChange={(e) => setManagerComment(e.target.value)}
                                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-teal-700"
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => setActiveActionId(null)}
                                  className="px-2.5 py-1 text-[10px] border rounded hover:bg-slate-100"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleDecideLeave(req.id, 'rejected')}
                                  className="px-2.5 py-1 text-[10px] bg-red-650 hover:bg-red-700 text-white rounded font-medium"
                                >
                                  Confirm Reject
                                </button>
                                <button
                                  onClick={() => handleDecideLeave(req.id, 'approved')}
                                  className="px-2.5 py-1 text-[10px] bg-teal-700 hover:bg-teal-800 text-white rounded font-medium"
                                >
                                  Confirm Approve
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => {
                                  setActiveActionId(req.id);
                                  setManagerComment('');
                                }}
                                className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] text-slate-700 font-semibold"
                              >
                                Process Decision
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-400 italic text-xs">
                    No departmental leave requests currently registered.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section: My Leave Requests Trail */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-md font-bold text-slate-800 border-b border-slate-100 pb-2">My Time-off Requests</h2>

            <div className="space-y-3">
              {loading ? (
                <div className="py-6 text-center text-slate-400 italic flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-teal-700" /> Loading...
                </div>
              ) : myLeaves.length > 0 ? (
                myLeaves.map((req) => (
                  <div key={req.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-150 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-slate-200 text-slate-700 rounded border border-slate-300">
                        {req.leave_type}
                      </span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                        req.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        req.status === 'approved' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-650">
                      <p className="font-semibold text-slate-700">Duration: {req.start_date} to {req.end_date}</p>
                      <p className="mt-1 italic text-slate-550">&quot;{req.reason}&quot;</p>
                      {req.manager_comment && (
                        <p className="text-[10px] bg-white border border-slate-100 p-2 rounded-lg text-slate-500 font-medium flex items-center gap-1 mt-1">
                          <MessageSquare className="h-3.5 w-3.5 text-slate-400" /> Reason response: {req.manager_comment}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 italic text-xs">
                  You haven&apos;t requested any leave yet.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
