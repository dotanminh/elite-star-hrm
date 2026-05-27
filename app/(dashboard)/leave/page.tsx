'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useProfile } from '@/components/profile-provider';
import { 
  leave as leaveText, 
  leaveTypeLabels, 
  leaveStatusLabels, 
  common 
} from '@/lib/i18n/vi';
import { 
  Calendar, 
  Send, 
  Check, 
  X, 
  Loader2, 
  MessageSquare,
  HelpCircle
} from 'lucide-react';

export default function LeavePage() {
  const { profile: currentUser } = useProfile();
  const supabase = createClient();

  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [approvalQueue, setApprovalQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [leaveType, setLeaveType] = useState<'annual' | 'sick' | 'unpaid' | 'maternity' | 'other'>('annual');
  const [durationLimit, setDurationLimit] = useState<'full' | 'morning' | 'afternoon'>('full');
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
  const [showConfirmModal, setShowConfirmModal] = useState<{ id: string, decision: 'approved' | 'rejected' } | null>(null);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);

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
      setFormError(leaveText.errors.fillAllFields);
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setFormError(leaveText.errors.endDateInvalid);
      return;
    }

    setFormSubmitting(true);
    try {
      // Rule: Nghỉ nửa ngày buổi sáng sẽ tính là nghỉ nguyên ngày.
      // We label this in the reason payload clearly.
      const displayDuration = durationLimit === 'full' 
        ? 'Cả ngày' 
        : durationLimit === 'morning' 
          ? 'Nửa ngày (Sáng - Tính nghỉ nguyên ngày)' 
          : 'Nửa ngày (Chiều - Tính nghỉ 0.5 ngày)';

      const finalReason = `[Thời gian: ${displayDuration}] - ${reason}`;

      const newRequest = {
        employee_id: currentUser?.id,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: finalReason,
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
        action: 'create_leave',
        table_name: 'leave_requests',
        record_id: data.id,
        new_values: newRequest
      });

      setFormSuccess(leaveText.errors.submitSuccess);
      setStartDate('');
      setEndDate('');
      setReason('');
      setDurationLimit('full');
      fetchData();
    } catch (err: any) {
      setFormError(err.message || leaveText.errors.submitError);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Leave Approval/Rejection Actions
  const handleDecideLeave = async (id: string, decision: 'approved' | 'rejected') => {
    setCommentError(null);
    setConfirmSubmitting(true);
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
        action: decision === 'approved' ? 'approve_leave' : 'reject_leave',
        table_name: 'leave_requests',
        record_id: id,
        old_values: { status: targetReq.status },
        new_values: updateFields
      });

      setActiveActionId(null);
      setManagerComment('');
      setShowConfirmModal(null);
      fetchData();
    } catch (err: any) {
      setCommentError(err.message || leaveText.errors.approvalError);
    } finally {
      setConfirmSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{leaveText.title}</h1>
        <p className="text-sm text-slate-500">{leaveText.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Submit Request Form */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 h-fit">
          <h2 className="text-md font-bold text-slate-800 border-b border-slate-100 pb-2">{leaveText.submitRequest}</h2>
          
          <form onSubmit={handleSubmitRequest} className="space-y-4">
            {formSuccess && (
              <div className="p-3 bg-teal-50 border border-teal-100 rounded-lg text-xs text-teal-700 font-semibold">
                {formSuccess}
              </div>
            )}
            {formError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700 font-semibold">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">{leaveText.leaveType}</label>
              <select
                value={leaveType}
                onChange={(e: any) => setLeaveType(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-teal-700 focus:border-teal-700"
              >
                <option value="annual">{leaveTypeLabels.annual}</option>
                <option value="sick">{leaveTypeLabels.sick}</option>
                <option value="unpaid">{leaveTypeLabels.unpaid}</option>
                <option value="maternity">{leaveTypeLabels.maternity}</option>
                <option value="other">{leaveTypeLabels.other}</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Thời gian nghỉ</label>
              <select
                value={durationLimit}
                onChange={(e: any) => setDurationLimit(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-teal-700 focus:border-teal-700"
              >
                <option value="full">Cả ngày (1.0 ngày phép)</option>
                <option value="morning">Nửa ngày - Buổi sáng (Tính là 1.0 ngày nghỉ)</option>
                <option value="afternoon">Nửa ngày - Buổi chiều (Tính là 0.5 ngày nghỉ)</option>
              </select>
              {durationLimit === 'morning' && (
                <p className="mt-1 text-[10px] text-amber-600 font-semibold">
                  ⚠️ Theo quy định Elite Star: Nghỉ nửa ngày buổi sáng tính là nghỉ nguyên ngày.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">{leaveText.startDate}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-teal-700 focus:border-teal-700"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">{leaveText.endDate}</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-teal-700 focus:border-teal-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">{leaveText.reasonDescription}</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-teal-700 focus:border-teal-700 placeholder-slate-400"
                placeholder={leaveText.reasonPlaceholder}
              />
            </div>

            <button
              type="submit"
              disabled={formSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 text-white py-3 rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 min-h-[48px]"
            >
              {formSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {leaveText.submitBtn}
            </button>
          </form>
        </div>

        {/* Center & Right Column: Own List and Department Approvals */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section: Approval Queue (Only for Managers / HR / Admin) */}
          {isApprover && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-md font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center justify-between">
                <span>{leaveText.approvalQueue}</span>
                <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 font-bold">
                  {approvalQueue.filter(r => r.status === 'pending').length} {leaveText.pending}
                </span>
              </h2>

              <div className="space-y-3">
                {approvalQueue.length > 0 ? (
                  approvalQueue.map((req) => (
                    <div key={req.id} className="p-4 bg-slate-50 rounded-xl border border-slate-150 space-y-3 shadow-inner">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-850 block text-xs">
                            {req.employee_profile?.first_name} {req.employee_profile?.last_name}
                          </span>
                          <span className="text-[10px] text-slate-400 block">{req.employee_profile?.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-slate-200 text-slate-700 rounded border border-slate-300">
                            {leaveTypeLabels[req.leave_type] || req.leave_type}
                          </span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                            req.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            req.status === 'approved' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {leaveStatusLabels[req.status] || req.status}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-1">
                        <p className="flex items-center gap-1 font-medium text-slate-500">
                          <Calendar className="h-3 w-3" /> {leaveText.duration} {req.start_date} {leaveText.to} {req.end_date}
                        </p>
                        <p className="italic text-slate-700 bg-white p-2 rounded-lg border border-slate-100">&quot;{req.reason}&quot;</p>
                        {req.manager_comment && (
                          <p className="text-[10px] text-slate-450 flex items-center gap-1 mt-1">
                            <MessageSquare className="h-3 w-3 text-slate-400" /> {leaveText.response} {req.manager_comment}
                          </p>
                        )}
                      </div>

                      {req.status === 'pending' && (
                        <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                          {activeActionId === req.id ? (
                            <div className="space-y-2">
                              {commentError && (
                                <p className="text-[10px] text-red-600 font-bold">{commentError}</p>
                              )}
                              <input
                                type="text"
                                placeholder={leaveText.commentPlaceholder}
                                value={managerComment}
                                onChange={(e) => setManagerComment(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-teal-700"
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionId(null);
                                    setManagerComment('');
                                  }}
                                  className="px-3 py-1.5 text-[10px] border border-slate-300 rounded-lg hover:bg-slate-100 font-semibold"
                                >
                                  {leaveText.cancelBtn}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmModal({ id: req.id, decision: 'rejected' })}
                                  className="px-3 py-1.5 text-[10px] bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold shadow-sm"
                                >
                                  {leaveText.confirmReject}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmModal({ id: req.id, decision: 'approved' })}
                                  className="px-3 py-1.5 text-[10px] bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold shadow-sm"
                                >
                                  {leaveText.confirmApprove}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActionId(req.id);
                                  setManagerComment('');
                                  setCommentError(null);
                                }}
                                className="flex items-center justify-center gap-1 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700 font-bold shadow-sm min-h-[36px]"
                              >
                                {leaveText.processDecision}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-400 italic text-xs">
                    {leaveText.noRequests}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section: My Leave Requests Trail */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-md font-bold text-slate-800 border-b border-slate-100 pb-2">{leaveText.myRequests}</h2>

            <div className="space-y-3">
              {loading ? (
                <div className="py-6 text-center text-slate-400 italic flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-teal-700" /> {leaveText.loading}
                </div>
              ) : myLeaves.length > 0 ? (
                myLeaves.map((req) => (
                  <div key={req.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-150 space-y-2 shadow-inner">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-slate-200 text-slate-700 rounded border border-slate-300">
                        {leaveTypeLabels[req.leave_type] || req.leave_type}
                      </span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                        req.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        req.status === 'approved' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {leaveStatusLabels[req.status] || req.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-650">
                      <p className="font-semibold text-slate-750">{leaveText.duration} {req.start_date} {leaveText.to} {req.end_date}</p>
                      <p className="mt-1 italic text-slate-550">&quot;{req.reason}&quot;</p>
                      {req.manager_comment && (
                        <p className="text-[10px] bg-white border border-slate-100 p-2 rounded-lg text-slate-550 font-semibold flex items-center gap-1 mt-1">
                          <MessageSquare className="h-3.5 w-3.5 text-slate-400" /> {leaveText.reasonResponse} {req.manager_comment}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 italic text-xs">
                  {leaveText.noMyRequests}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Modern Confirmation Dialog (Preventing misclicks on Mobile) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <HelpCircle className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-md">
                {showConfirmModal.decision === 'approved' ? 'Xác nhận duyệt đơn nghỉ phép?' : 'Xác nhận từ chối đơn?'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Hành động này sẽ cập nhật trạng thái đơn phép ngay lập tức và ghi nhận vào nhật ký hệ thống.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={confirmSubmitting}
                onClick={() => setShowConfirmModal(null)}
                className="flex-1 px-4 py-2.5 border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={confirmSubmitting}
                onClick={() => handleDecideLeave(showConfirmModal.id, showConfirmModal.decision)}
                className={`flex-1 px-4 py-2.5 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 shadow-md ${
                  showConfirmModal.decision === 'approved' 
                    ? 'bg-teal-700 hover:bg-teal-800 shadow-teal-700/20' 
                    : 'bg-red-650 hover:bg-red-700 shadow-red-700/20'
                }`}
              >
                {confirmSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
