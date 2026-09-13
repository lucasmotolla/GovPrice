
import React, { useState, useMemo, useEffect } from 'react';
import Layout from './components/Layout';
import SearchAssistant from './components/SearchAssistant';
import DataCollector from './components/DataCollector';
import PriceMap from './components/PriceMap';
import ReportGenerator from './components/ReportGenerator';
import PostAnalysisGuide from './components/PostAnalysisGuide';
import Compendium from './components/Compendium';
import PlanningAssistant from './components/PlanningAssistant';
import PythonConsole from './components/PythonConsole';
import { PriceItem, DashboardStats } from './types';
import { calculateStats } from './utils/calculations';
import { calculateStatsWithPython } from './services/pythonService';
import { PROCEMPA_POWERBI_URL, SEI_WORK_URL } from './constants';
import { ExternalLink, FileDown, AlertTriangle, Archive, Save, Sparkles } from 'lucide-react';

const STORAGE_KEY = 'govprice_state_v1';

export default function App() {
  const [items, setItems] = useState<PriceItem[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [pythonStats, setPythonStats] = useState<DashboardStats | null>(null);

  // Load state on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.items) setItems(parsed.items);
        // In a real app, we would pass ETP/TR state down to PlanningAssistant via props to restore it too
      } catch (e) {
        console.error("Failed to load state", e);
      }
    }
  }, []);

  // Auto-save state when items change
  useEffect(() => {
    if (items.length > 0) {
        const state = { items };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        setLastSaved(new Date());
    }
  }, [items]);

  // Asynchronous calculation via Python engine
  useEffect(() => {
    let isMounted = true;
    if (items.length > 0) {
      calculateStatsWithPython(items).then((res) => {
        if (isMounted) setPythonStats(res);
      });
    } else {
      setPythonStats(null);
    }
    return () => { isMounted = false; };
  }, [items]);
  
  // Calculate stats at App level to pass to ReportGenerator
  const localStats = useMemo(() => calculateStats(items), [items]);
  const stats = pythonStats || localStats;
  // Just use the first product description as the main one for the report
  const mainProductName = items.length > 0 ? items[0].productDescription : "";

  const handleAddItem = (item: PriceItem) => {
    // Law IN 65/2021: "Assim, os preços encontrados em sítios valem apenas por 1 (uma) pesquisa."
    const exists = items.find(i => i.sourceName.toLowerCase() === item.sourceName.toLowerCase());
    if (exists) {
      if(!window.confirm(`Já existe um preço da fonte "${item.sourceName}". A IN 65/2021 permite apenas 1 preço por domínio/grupo econômico. Deseja substituir o anterior?`)) {
        return;
      }
      setItems(prev => prev.map(i => i.id === exists.id ? item : i));
    } else {
      setItems(prev => [...prev, item]);
    }
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleUpdateIpca = (id: string, factor: number) => {
      setItems(prev => prev.map(i => {
          if (i.id === id) {
              return { ...i, priceAdjusted: i.priceOriginal * factor };
          }
          return i;
      }));
  };

  const exportToCSV = () => {
     // Prepare headers compatible with "Mapa de Preços" Excel columns
     const headers = ["Descrição", "Preço Original", "Data", "Fonte", "Link", "IPCA Ajuste", "Preço Final", "Status"];
     const rows = items.map(i => [
         `"${i.productDescription.replace(/"/g, '""')}"`, 
         i.priceOriginal.toFixed(2).replace('.', ','),
         i.accessDate,
         `"${i.sourceName}"`,
         `"${i.sourceUrl}"`,
         i.priceAdjusted ? ((i.priceAdjusted / i.priceOriginal) - 1).toFixed(4).replace('.', ',') : "0",
         (i.priceAdjusted || i.priceOriginal).toFixed(2).replace('.', ','),
         i.isValid ? "Válido" : "Descartado"
     ]);
     
     const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(";") + "\n" 
        + rows.map(e => e.join(";")).join("\n");
        
     const encodedUri = encodeURI(csvContent);
     const link = document.createElement("a");
     link.setAttribute("href", encodedUri);
     link.setAttribute("download", "mapa_de_precos_export.csv");
     document.body.appendChild(link);
     link.click();
  };

  return (
    <Layout>
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div className="text-xs text-slate-500 flex items-center gap-1">
             <Save size={14} />
             {lastSaved ? `Salvo automaticamente às ${lastSaved.toLocaleTimeString()}` : 'Pronto para iniciar'}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <a 
              href="/govprice_full_code_for_gemini.md"
              download="govprice_full_code_for_gemini.md"
              className="bg-blue-600 text-white px-3.5 py-2 rounded-md text-sm font-medium hover:bg-blue-500 transition-colors flex items-center gap-2 shadow-sm"
              title="Baixar todo o código em um arquivo único formatado em Markdown para carregar ou colar no Google Gemini"
            >
               <Sparkles size={16} />
               Exportar p/ Gemini (.md)
            </a>
            <a 
              href="/api/export/zip"
              download="govprice_projeto_completo.zip"
              className="bg-emerald-700 text-white px-3.5 py-2 rounded-md text-sm font-medium hover:bg-emerald-600 transition-colors flex items-center gap-2 shadow-sm"
              title="Baixar todo o código-fonte (Python, Backend Express, Frontend React e configs) em .ZIP"
            >
               <FileDown size={16} />
               Exportar Código (.zip)
            </a>
            <a 
              href={SEI_WORK_URL}
              target="_blank"
              rel="noreferrer"
              className="bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-700 transition-colors flex items-center gap-2 shadow-md"
            >
               <Archive size={16} />
               Ir para Meus Processos (SEI)
            </a>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
         {/* Procempa Power BI Shortcut - Essential for "Valores Homologados" */}
         <div className="lg:col-span-1 bg-gradient-to-r from-blue-900 to-blue-800 rounded-lg p-6 text-white shadow-md flex flex-col justify-between">
             <div>
                 <h3 className="font-bold text-lg mb-2">Histórico Procempa</h3>
                 <p className="text-blue-100 text-sm mb-4">
                    Acesse valores homologados anteriormente pela Prefeitura de Porto Alegre.
                 </p>
             </div>
             <a 
                href={PROCEMPA_POWERBI_URL} 
                target="_blank" 
                rel="noreferrer"
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2 transition-colors border border-white/20"
             >
                Acessar Power BI <ExternalLink size={16} />
             </a>
         </div>

         {/* Info Card */}
         <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="text-yellow-500" size={18} />
                Regras de Ouro (IN 65/2021 & IN 001/2025)
            </h3>
            <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                <li><strong>Prioridade 1:</strong> Portais Públicos (Licitacon, Painel de Preços, BPS).</li>
                <li><strong>Prioridade 2:</strong> Sítios de Domínio Amplo (Amazon, Magalu, Kalunga).</li>
                <li><strong>Proibido:</strong> Marketplaces sem loja oficial (Shopee, OLX).</li>
                <li><strong>Validade:</strong> Preços de internet válidos por 180 dias.</li>
            </ul>
         </div>
      </div>

      {/* Main Workflow */}
      <div className="space-y-8">

        {/* Phase 0: Planning */}
        <PlanningAssistant />

        {/* Motor Python 3.10 Engine - Interactive Console */}
        <PythonConsole currentItems={items} />

        {/* Phase 1: Search Strategy */}
        <SearchAssistant onStatsUpdate={() => {}} />
        
        {/* Phase 2: Collection */}
        <DataCollector onAddItem={handleAddItem} />
        
        {/* Phase 3: Price Map */}
        <div className="relative">
            <PriceMap 
                items={items} 
                onRemoveItem={handleRemoveItem} 
                onUpdateIpca={handleUpdateIpca}
            />
            {items.length > 0 && (
                <div className="absolute top-6 right-6">
                    <button 
                        onClick={exportToCSV}
                        className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-800 transition-colors shadow-lg"
                    >
                        <FileDown size={16} />
                        Exportar CSV
                    </button>
                </div>
            )}
        </div>

        {/* Phase 4 & 5: Post-Processing */}
        {items.length > 0 && (
            <>
                <ReportGenerator 
                    stats={stats} 
                    items={items} 
                    productName={mainProductName} 
                />
                <PostAnalysisGuide />
            </>
        )}

        {/* Reference Material */}
        <Compendium />

      </div>
    </Layout>
  );
}
