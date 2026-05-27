'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useProfile } from '@/components/profile-provider';
import { 
  auditLogs as logsText, 
  auditActionLabels, 
  common 
} from '@/lib/i18n/vi';
import { 
  History, 
  Search, 
  Loader2, 
  FileText,
  Calendar
} from 'lucide-react';

export default function AuditLogsPage() {
  const { profile: currentUser } = useProfile();
  const supabase = createClient();

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('');

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*, profiles!audit_logs_actor_id_fkey(first_name, last_name, email)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching audit ledger logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchAuditLogs();
    }
  }, [currentUser]);

  // Filters logic
  const filteredLogs = logs.filter((log) => {
    const actorName = `${log.profiles?.first_name || ''} ${log.profiles?.last_name || ''}`.toLowerCase();
    const actorEmail = (log.profiles?.email || '').toLowerCase();
    const rawAction = log.action || '';
    const translatedAction = (auditActionLabels[rawAction] || rawAction).toLowerCase();
    const actionName = rawAction.toLowerCase();
    const tableName = (log.table_name || '').toLowerCase();
    
    const searchString = searchQuery.toLowerCase();
    const matchesSearch = 
      actorName.includes(searchString) || 
      actorEmail.includes(searchString) || 
      actionName.includes(searchString) || 
      translatedAction.includes(searchString) ||
      tableName.includes(searchString);

    const matchesAction = selectedAction ? log.action === selectedAction : true;

    return matchesSearch && matchesAction;
  });

  // Extract unique actions for filters
  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{logsText.title}</h1>
        <p className="text-sm text-slate-500">{logsText.subtitle}</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={logsText.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 w-full rounded-lg border border-slate-300 text-sm focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700 bg-white"
          />
        </div>
        
        <div>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="border border-slate-300 rounded-lg py-2 px-3 text-xs bg-white focus:border-teal-700 focus:outline-none"
          >
            <option value="">{logsText.allActionTypes}</option>
            {uniqueActions.map((act: any) => (
              <option key={act} value={act}>{auditActionLabels[act] || act}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Ledger List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 text-teal-700 animate-spin" />
            <span className="text-sm text-slate-500 font-medium">{logsText.loading}</span>
          </div>
        ) : filteredLogs.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-5 hover:bg-slate-50/40 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                  
                  {/* Actor Details */}
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-100 p-2 rounded text-slate-500">
                      <History className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">
                        {log.profiles?.first_name} {log.profiles?.last_name}
                      </span>
                      <span className="text-[10px] text-slate-450 block">{log.profiles?.email}</span>
                    </div>
                  </div>

                  {/* Metadata Indicators */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full font-bold uppercase text-[9px] bg-teal-50 text-teal-700 border border-teal-200">
                      {auditActionLabels[log.action] || log.action}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-medium flex items-center gap-1">
                      <FileText className="h-3 w-3 text-slate-400" /> {log.table_name}
                    </span>
                    <span className="text-slate-450 text-[10px] flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(log.created_at).toLocaleString('vi-VN')}
                    </span>
                  </div>

                </div>

                {/* Audit Values Ledger Diffs */}
                {(log.old_values || log.new_values) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-[10px] font-mono text-slate-650 bg-slate-50 p-3 rounded-lg border border-slate-150">
                    
                    {/* Old Values */}
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-slate-400 mb-1">{logsText.oldState}</span>
                      {log.old_values ? (
                        <pre className="overflow-x-auto p-2 bg-white rounded border border-slate-100 leading-normal max-h-36">
                          {JSON.stringify(log.old_values, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-slate-400 italic">{logsText.noOldState}</span>
                      )}
                    </div>

                    {/* New Values */}
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-slate-400 mb-1">{logsText.newState}</span>
                      {log.new_values ? (
                        <pre className="overflow-x-auto p-2 bg-white rounded border border-slate-100 leading-normal max-h-36">
                          {JSON.stringify(log.new_values, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-slate-400 italic">{logsText.noNewState}</span>
                      )}
                    </div>

                  </div>
                )}

              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 italic text-xs">
            {logsText.noResults}
          </div>
        )}
      </div>

    </div>
  );
}
