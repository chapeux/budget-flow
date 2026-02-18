import React from 'react';
import { Wrench } from 'lucide-react';
import { FuelCalculator } from './FuelCalculator';
import { CashVsInstallments } from './CashVsInstallments';
import { CltVsPj } from './CltVsPj';
import { InflationConverter } from './InflationConverter';

export const ToolsPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-600/20">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Ferramentas Utilitárias</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Assistentes inteligentes para suas decisões do dia a dia.</p>
          </div>
        </div>
      </div>

      {/* Tools Accordion-like List */}
      <div className="flex flex-col gap-4">
        <FuelCalculator />
        <CashVsInstallments />
        <CltVsPj />
        <InflationConverter />
        
        {/* Placeholder for future tools */}
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl opacity-50">
          <p className="text-slate-400 dark:text-slate-600 text-sm italic">Novas ferramentas em breve...</p>
        </div>
      </div>
    </div>
  );
};
