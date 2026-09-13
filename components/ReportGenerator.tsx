import React, { useState, useEffect } from 'react';
import { Copy, FileText, Check, Download, Terminal, RefreshCw } from 'lucide-react';
import { DashboardStats, PriceItem } from '../types';
import { generateLaudoText as localGenerateLaudoText } from '../utils/calculations';
import { generateLaudoWithPython } from '../services/pythonService';

interface ReportGeneratorProps {
  stats: DashboardStats;
  items: PriceItem[];
  productName: string;
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({ stats, items, productName }) => {
  const [copied, setCopied] = useState(false);
  const [laudoText, setLaudoText] = useState<string>('');
  const [isPythonLoading, setIsPythonLoading] = useState<boolean>(false);
  const [usePython, setUsePython] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchLaudo = async () => {
      if (usePython) {
        setIsPythonLoading(true);
        try {
          const text = await generateLaudoWithPython(items, productName || "Item Genérico");
          if (isMounted) setLaudoText(text);
        } catch {
          if (isMounted) setLaudoText(localGenerateLaudoText(stats, items, productName || "Item Genérico"));
        } finally {
          if (isMounted) setIsPythonLoading(false);
        }
      } else {
        setLaudoText(localGenerateLaudoText(stats, items, productName || "Item Genérico"));
      }
    };

    fetchLaudo();
    return () => { isMounted = false; };
  }, [items, stats, productName, usePython]);

  const handleCopy = () => {
    navigator.clipboard.writeText(laudoText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([laudoText], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `laudo_pesquisa_precos_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <FileText className="text-blue-600" size={20} />
          <h2 className="text-lg font-semibold text-slate-800">
            4. Laudo de Formação de Preço (Para SEI)
          </h2>
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
            <Terminal size={12} />
            {usePython ? 'Motor Python 3.10' : 'Renderizador Local'}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setUsePython(!usePython)}
            className="text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center gap-1 transition-colors"
          >
            <RefreshCw size={12} className={isPythonLoading ? "animate-spin" : ""} />
            {usePython ? 'Alternar p/ Local' : 'Ativar Motor Python'}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            title="Baixar arquivo de texto para anexar ao SEI"
          >
            <Download size={14} />
            Baixar .txt
          </button>

          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
              copied ? 'bg-green-100 text-green-700' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copiado!' : 'Copiar Laudo'}
          </button>
        </div>
      </div>

      <div className="relative">
        {isPythonLoading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center rounded-md z-10">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white px-3 py-2 rounded-md shadow border">
              <Terminal size={14} className="animate-pulse text-yellow-600" />
              Processando laudo no interpretador Python 3.10...
            </div>
          </div>
        )}
        <div className="bg-slate-50 border border-slate-200 rounded-md p-4 font-mono text-xs leading-relaxed text-slate-800 whitespace-pre-wrap h-64 overflow-y-auto select-all">
          {laudoText}
        </div>
      </div>
      
      <p className="text-xs text-slate-500 mt-2">
        * Copie este texto e cole em um documento "Externo" ou "Interno" (Editor de Texto) no processo SEI. Certifique-se de assinar digitalmente conforme art. 23 da Lei 14.133/2021.
      </p>
    </div>
  );
};

export default ReportGenerator;
