import React, { useState } from 'react';
import { Turma, Partner } from '../types';
import { CheckCircle2, XCircle, AlertTriangle, ExternalLink, Download } from 'lucide-react';

interface DocumentReportProps {
  turmas: Turma[];
  partners: Partner[];
}

export function DocumentReport({ turmas, partners }: DocumentReportProps) {
  const [filterYear, setFilterYear] = useState('');
  const [filterQuarter, setFilterQuarter] = useState('');

  const validStagesClean = [
    'concluidos', 
    'envio de prototipos', 
    'projeto', 
    'pre projeto', 
    'pendencia de projeto'
  ];

  // Map data
  const reportData = turmas
    .filter(turma => {
      const ds = (turma.dealstage || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      return validStagesClean.includes(ds);
    })
    .map(turma => {
      const partner = partners.find(p => p.id === turma.partnerId);
    return {
      turmaId: turma.id,
      parceiro: partner?.name || 'Não Vinculado',
      negocio: turma.projectTitle || turma.name,
      ano: turma.applicationYear || 'N/C',
      trimestre: turma.applicationQuarter || 'N/C',
      modulo: turma.courseModule || 'N/C',
      termoStatus: turma.partnershipTermStatus || partner?.partnershipTermStatus || 'Pendente',
      termoValidade: turma.partnershipTermValidity || partner?.partnershipTermValidity || 'N/C',
      termoLink: turma.partnershipTermLink || partner?.partnershipTermLink || '',
      tapiStatus: turma.tapiStatus || 'Pendente',
      tapiLink: turma.tapiLink || ''
    };
  });

  const filteredData = reportData.filter(row => {
    if (filterYear && row.ano !== filterYear) return false;
    if (filterQuarter && row.trimestre !== filterQuarter) return false;
    return true;
  });

  const years = Array.from(new Set(reportData.map(r => r.ano).filter(a => a !== 'N/C'))).sort();
  const quarters = Array.from(new Set(reportData.map(r => r.trimestre).filter(q => q !== 'N/C'))).sort();

  const handleExportCSV = () => {
    const headers = ['Parceiro', 'Negócio', 'Ano', 'Trimestre', 'Módulo', 'Status Termo', 'Validade Termo', 'Link Termo', 'Status TAPI', 'Link TAPI'];
    const rows = filteredData.map(r => [
      r.parceiro,
      r.negocio,
      r.ano,
      r.trimestre,
      r.modulo,
      r.termoStatus,
      r.termoValidade,
      r.termoLink,
      r.tapiStatus,
      r.tapiLink
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(';'), ...rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_documentos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusIcon = (status: string) => {
    if (status === 'Ativo') return <CheckCircle2 size={14} className="text-emerald-500" />;
    if (status === 'Expirado') return <XCircle size={14} className="text-rose-500" />;
    if (status === 'Revisão Necessária') return <AlertTriangle size={14} className="text-amber-500" />;
    return <AlertTriangle size={14} className="text-slate-400" />;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-slate-50">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Relatório Incremental de Documentos</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Visão geral de Termos de Parceria e TAPI vinculados aos negócios</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
          >
            <option value="">Todos os Anos</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select 
            value={filterQuarter}
            onChange={(e) => setFilterQuarter(e.target.value)}
            className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
          >
            <option value="">Todos os Trimestres</option>
            {quarters.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
          
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
          >
            <Download size={14} />
            Exportar CSV
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto max-h-[600px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 bg-white shadow-xs z-10">
            <tr className="bg-slate-50/75 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="p-3 border-r border-slate-100 min-w-[150px]">Parceiro</th>
              <th className="p-3 border-r border-slate-100 min-w-[200px]">Negócio (Projeto)</th>
              <th className="p-3 border-r border-slate-100">Ano</th>
              <th className="p-3 border-r border-slate-100">Trimestre</th>
              <th className="p-3 border-r border-slate-100">Módulo</th>
              <th className="p-3 border-r border-slate-100 min-w-[120px]">Termo de Parceria</th>
              <th className="p-3 border-r border-slate-100">Validade (Termo)</th>
              <th className="p-3 border-r border-slate-100 min-w-[120px]">TAPI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.length > 0 ? filteredData.map((row) => (
              <tr key={row.turmaId} className="hover:bg-indigo-50/30 transition-colors">
                <td className="p-3 border-r border-slate-100 font-semibold text-slate-700 truncate max-w-[200px]" title={row.parceiro}>
                  {row.parceiro}
                </td>
                <td className="p-3 border-r border-slate-100 font-medium text-slate-600 truncate max-w-[250px]" title={row.negocio}>
                  {row.negocio}
                </td>
                <td className="p-3 border-r border-slate-100 text-slate-600">{row.ano}</td>
                <td className="p-3 border-r border-slate-100 text-slate-600">{row.trimestre}</td>
                <td className="p-3 border-r border-slate-100 text-slate-600">{row.modulo}</td>
                
                {/* Termo de Parceria */}
                <td className="p-3 border-r border-slate-100">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(row.termoStatus)}
                    <span className={`font-semibold ${row.termoStatus === 'Ativo' ? 'text-emerald-700' : row.termoStatus === 'Expirado' ? 'text-rose-700' : 'text-amber-600'}`}>
                      {row.termoStatus}
                    </span>
                  </div>
                  {row.termoLink ? (
                    <a href={row.termoLink} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1 mt-1 font-medium">
                      Ver Termo <ExternalLink size={10} />
                    </a>
                  ) : (
                    <span className="text-[10px] text-slate-400 mt-1 block">Sem link vinculado</span>
                  )}
                </td>
                
                {/* Validade Termo */}
                <td className="p-3 border-r border-slate-100 text-slate-600 font-medium whitespace-nowrap">
                  {row.termoValidade}
                </td>
                
                {/* TAPI */}
                <td className="p-3 border-r border-slate-100">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(row.tapiStatus)}
                    <span className={`font-semibold ${row.tapiStatus === 'Ativo' ? 'text-emerald-700' : row.tapiStatus === 'Expirado' ? 'text-rose-700' : 'text-amber-600'}`}>
                      {row.tapiStatus}
                    </span>
                  </div>
                  {row.tapiLink ? (
                    <a href={row.tapiLink} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1 mt-1 font-medium">
                      Ver TAPI <ExternalLink size={10} />
                    </a>
                  ) : (
                    <span className="text-[10px] text-slate-400 mt-1 block">Sem link vinculado</span>
                  )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400 text-xs font-medium">
                  Nenhum registro encontrado para os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
