import React from 'react';
import { Users, Shield, UserCheck, Phone, Mail, Award, CheckCircle2 } from 'lucide-react';
import { storage } from '../../services/storage';

export const EmployeesView: React.FC = () => {
  const currentTenantId = storage.getActiveTenantId();
  const employees = storage.getEmployees(currentTenantId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold block mb-0.5">
            PERSONNEL & ROLE-BASED ACCESS CONTROL (RBAC)
          </span>
          <h2 className="text-xl font-bold text-slate-100">
            Field Couriers & Station Dispatchers
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Authorized logistics staff members, performance ratings, and shift allocations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {employees.map((emp) => {
          return (
            <div
              key={emp.id}
              className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-colors space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    {emp.name}
                  </h3>
                  <span className="text-[11px] font-mono font-semibold text-indigo-400">
                    {emp.role}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  {emp.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{emp.email}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{emp.phone}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
                <div>
                  <span className="text-[10px] text-slate-500 block">Rating:</span>
                  <span className="font-bold text-amber-400 flex items-center gap-1">
                    ★ {emp.rating}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Drops:</span>
                  <span className="text-slate-200">{emp.totalCompletedDeliveries}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
