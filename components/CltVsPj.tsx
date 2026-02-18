
import React, { useState, useMemo } from 'react';
import { Briefcase, Building2, UserCheck, Info, ChevronDown, ChevronUp, Calculator, ArrowRight, DollarSign } from 'lucide-react';

export const CltVsPj: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [cltGross, setCltGross] = useState<string>('5000');
  const [cltBenefits, setCltBenefits] = useState<string>('800'); // VA/VR
  const [pjGross, setPjGross] = useState<string>('8000');
  const [pjCosts, setPjCosts] = useState<string>('300'); // Contador/Taxas

  const simulation = useMemo(() => {
    const gross = parseFloat(cltGross) || 0;
    const ben = parseFloat(cltBenefits) || 0;
    const pGross = parseFloat(pjGross) || 0;
    const pCosts = parseFloat(pjCosts) || 0;

    // --- CLT Calculation (Simplified 2024 Table) ---
    // INSS
    let inss = 0;
    if (gross <= 1412) inss = gross * 0.075;
    else if (gross <= 2666.68) inss = (1412 * 0.075) + (gross - 1412) * 0.09;
    else if (gross <= 4000.03) inss = (1412 * 0.075) + (1254.68 * 0.09) + (gross - 2666.68) * 0.12;
    else inss = (1412 * 0.075) + (1254.68 * 0.09) + (1333.35 * 0.12) + (Math.min(gross, 7786.02) - 4000.03) * 0.14;

    // IRRF (Simplificado)
    const baseIrrf = gross - inss;
    let irrf = 0;
    if (baseIrrf > 4664.68) irrf = (baseIrrf * 0.275) - 896;
    else if (baseIrrf > 3751.06) irrf = (baseIrrf * 0.225) - 662.77;
    else if (baseIrrf > 2826.66) irrf = (baseIrrf * 0.15) - 381.44;
    else if (baseIrrf > 2259.20) irrf = (baseIrrf * 0.075) - 169.44;

    const netSalary = gross - inss - irrf;
    const fgts = gross * 0.08;
    // Provisions (13th and Vacations spread monthly)
    const monthlyProvisions = (gross / 12) + (gross * 1.33 / 12);
    const totalCltValue = netSalary + fgts + ben + monthlyProvisions;

    // --- PJ Calculation (Simples Nacional Anexo III - 6%) ---
    const pjTax = pGross * 0.06;
    const totalPjValue = pGross - pjTax - pCosts;

    return {
      clt: {
        inss,
        irrf,
        net: netSalary,
        fgts,
        provisions: monthlyProvisions,
        total: totalCltValue
      },
      pj: {
        tax: pjTax,
        total: totalPjValue
      },
      winner: totalPjValue > totalCltValue ? 'PJ' : 'CLT',
      diff: Math.abs(totalPjValue - totalCltValue)
    };
  }, [cltGross, cltBenefits, pjGross, pjCosts]);

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border transition-all duration-300 overflow-hidden ${isOpen ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-blue-300'}`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 flex items-center justify-between text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
      >
        <div className="flex items-center gap-4">
          <div className={`p-2.5 rounded-xl transition-colors ${isOpen ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'}`}>
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white uppercase tracking-tight text-sm">Simulador CLT vs. PJ</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Qual modelo de contratação rende mais líquido?</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-6 pt-0 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6 mb-8">
            {/* Inputs CLT */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-blue-600 uppercase flex items-center gap-2">
                <UserCheck className="w-4 h-4" /> Proposta CLT
              </h4>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Salário Bruto</label>
                  <input type="number" value={cltGross} onChange={(e) => setCltGross(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Benefícios (Mensal)</label>
                  <input type="number" value={cltBenefits} onChange={(e) => setCltBenefits(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold" />
                </div>
              </div>
            </div>

            {/* Inputs PJ */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-emerald-600 uppercase flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Proposta PJ
              </h4>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Valor Bruto NF</label>
                  <input type="number" value={pjGross} onChange={(e) => setPjGross(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Custos (Contador/Taxas)</label>
                  <input type="number" value={pjCosts} onChange={(e) => setPjCosts(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* CLT Result */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase">Resumo CLT</span>
                <span className="text-sm font-bold text-blue-600">R$ {simulation.clt.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-slate-500"><span>Líquido Mensal:</span> <span className="text-slate-900 dark:text-slate-200">R$ {simulation.clt.net.toFixed(2)}</span></div>
                {/* Fix: removed reference to non-existent property inSimpleTax to resolve TypeScript error */}
                <div className="flex justify-between text-rose-500"><span>Impostos (INSS+IRRF):</span> <span>-R$ {(simulation.clt.inss + simulation.clt.irrf).toFixed(2)}</span></div>
                <div className="flex justify-between text-emerald-600 font-medium"><span>Benefícios + FGTS:</span> <span>+R$ {(parseFloat(cltBenefits) + simulation.clt.fgts).toFixed(2)}</span></div>
                <div className="flex justify-between text-blue-500 italic"><span>Provisão (13º+Férias):</span> <span>+R$ {simulation.clt.provisions.toFixed(2)}</span></div>
              </div>
            </div>

            {/* PJ Result */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase">Resumo PJ</span>
                <span className="text-sm font-bold text-emerald-600">R$ {simulation.pj.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-slate-500"><span>Faturamento Bruto:</span> <span className="text-slate-900 dark:text-slate-200">R$ {parseFloat(pjGross).toFixed(2)}</span></div>
                <div className="flex justify-between text-rose-500"><span>Imposto (6% est.):</span> <span>-R$ {simulation.pj.tax.toFixed(2)}</span></div>
                <div className="flex justify-between text-rose-500"><span>Custos Operacionais:</span> <span>-R$ {parseFloat(pjCosts).toFixed(2)}</span></div>
                <div className="flex justify-between text-slate-400 mt-2"><span>Obs:</span> <span className="text-right">Sem benefícios ou férias remuneradas</span></div>
              </div>
            </div>
          </div>

          {/* Winner Banner */}
          <div className={`mt-6 p-5 rounded-2xl border-2 flex items-center justify-between ${simulation.winner === 'PJ' ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20' : 'bg-blue-50 border-blue-100 dark:bg-blue-900/20'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md ${simulation.winner === 'PJ' ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'}`}>
                <Calculator className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Opção com maior valor real:</p>
                <h3 className={`text-xl font-black uppercase ${simulation.winner === 'PJ' ? 'text-emerald-700 dark:text-emerald-400' : 'text-blue-700 dark:text-blue-400'}`}>
                  Contratação {simulation.winner}
                </h3>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Vantagem Mensal</p>
              <p className={`text-lg font-bold ${simulation.winner === 'PJ' ? 'text-emerald-600' : 'text-blue-600'}`}>R$ {simulation.diff.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
            </div>
          </div>

          <div className="mt-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl flex items-start gap-3">
            <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              O cálculo de <strong>Valor Real CLT</strong> dilui o 13º salário, o terço constitucional de férias e o FGTS em parcelas mensais para possibilitar uma comparação justa com o PJ, que geralmente recebe um valor fixo sem esses benefícios adicionais.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
