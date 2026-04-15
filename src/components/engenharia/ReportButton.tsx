"use client";
import React, { useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { FileText, Loader2, Download, AlertCircle } from 'lucide-react';
import { RelatorioPDF } from './RelatorioPDF';

interface ReportButtonProps {
  projetoId: string;
  projectName: string;
}

export const ReportButton: React.FC<ReportButtonProps> = ({ projetoId, projectName }) => {
  const [loadingData, setLoadingData] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReportData = async () => {
    setLoadingData(true);
    setError(null);
    try {
      const res = await fetch(`/api/engenharia/relatorio?projetoId=${projetoId}`);
      if (!res.ok) throw new Error("Erro ao carregar dados do projeto");
      const data = await res.json();
      setReportData(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingData(false);
    }
  };

  if (!reportData) {
    return (
      <button 
        onClick={(e) => { e.preventDefault(); fetchReportData(); }}
        disabled={loadingData}
        className="flex items-center gap-2 p-2 px-3 text-xs font-bold text-slate-500 hover:text-[#1E3A8A] hover:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-100"
      >
        {loadingData ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
        Relatório
      </button>
    );
  }

  return (
    <div onClick={(e) => e.preventDefault()} className="flex items-center gap-2">
      <PDFDownloadLink 
        document={<RelatorioPDF data={reportData} />} 
        fileName={`Relatorio_Tecnico_${projectName.replace(/\s+/g, '_')}.pdf`}
      >
        {({ blob, url, loading, error }) => (
          <button className="flex items-center gap-2 p-2 px-3 text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-all border border-emerald-100">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            Baixar PDF
          </button>
        )}
      </PDFDownloadLink>
      <button onClick={() => setReportData(null)} className="text-[10px] text-slate-400 hover:text-red-500">Limpar</button>
    </div>
  );
};
