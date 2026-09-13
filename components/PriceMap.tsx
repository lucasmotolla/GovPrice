
import React, { useMemo, useState, useEffect } from 'react';
import { Trash2, AlertTriangle, CheckCircle, ExternalLink, ZoomIn, X, Calculator, Filter, FileDown, TrendingUp, TrendingDown, Minus, Lightbulb, Terminal } from 'lucide-react';
import { PriceItem, DashboardStats } from '../types';
import { calculateStats, formatCurrency, formatPercent } from '../utils/calculations';
import { calculateStatsWithPython } from '../services/pythonService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { PROCEMPA_POWERBI_URL } from '../constants';

interface PriceMapProps {
  items: PriceItem[];
  onRemoveItem: (id: string) => void;
  onUpdateIpca: (id: string, factor: number) => void;
  onUpdateItem?: (id: string, updates: Partial<PriceItem>) => void;
}

const PriceMap: React.FC<PriceMapProps> = ({ items, onRemoveItem, onUpdateIpca, onUpdateItem }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [justification, setJustification] = useState('');
  const [showReferenceInputs, setShowReferenceInputs] = useState(false);
  const [pythonStats, setPythonStats] = useState<DashboardStats | null>(null);
  const [isPythonLoading, setIsPythonLoading] = useState<boolean>(false);

  const filteredItems = useMemo(() => {
    if (!selectedCategory) return items;
    return items.filter(item => item.category === selectedCategory);
  }, [items, selectedCategory]);

  const localStats = useMemo(() => calculateStats(filteredItems), [filteredItems]);

  useEffect(() => {
    let isMounted = true;
    if (filteredItems.length > 0) {
      setIsPythonLoading(true);
      calculateStatsWithPython(filteredItems).then((res) => {
        if (isMounted) {
          setPythonStats(res);
          setIsPythonLoading(false);
        }
      });
    } else {
      setPythonStats(null);
      setIsPythonLoading(false);
    }
    return () => { isMounted = false; };
  }, [filteredItems]);

  const stats = pythonStats || localStats;
  
  const categories = useMemo(() => {
    const cats = new Set(items.map(i => i.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [items]);

  // Calculate deviations from historical data
  const consistencyAnalysis = useMemo(() => {
    return filteredItems.map(item => {
        const ref = item.homologatedReference || item.estimatedReference;
        if (!ref) return { status: 'UNKNOWN', diff: 0 };
        
        const price = item.priceAdjusted || item.priceOriginal;
        const diff = ((price - ref) / ref) * 100;
        
        return {
            status: Math.abs(diff) > 25 ? 'WARNING' : 'OK',
            diff: diff,
            item: item
        };
    });
  }, [filteredItems]);

  const hasConsistencyWarnings = consistencyAnalysis.some(a => a.status === 'WARNING');

  const exportToCSV = () => {
     const headers = ["Descrição", "Preço Original", "Data", "Fonte", "Link", "IPCA Ajuste", "Preço Final", "Ref. Histórica", "Status"];
     const rows = filteredItems.map(i => [
         `"${i.productDescription.replace(/"/g, '""')}"`, 
         i.priceOriginal.toFixed(2).replace('.', ','),
         i.accessDate,
         `"${i.sourceName}"`,
         `"${i.sourceUrl}"`,
         i.priceAdjusted ? ((i.priceAdjusted / i.priceOriginal) - 1).toFixed(4).replace('.', ',') : "0",
         (i.priceAdjusted || i.priceOriginal).toFixed(2).replace('.', ','),
         (i.homologatedReference || i.estimatedReference || 0).toFixed(2).replace('.', ','),
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

  // Check for general outliers against the calculated reference (Mean/Median)
  const isOver27Percent = items.some(item => {
      if (!item.isValid) return false;
      const price = item.priceAdjusted || item.priceOriginal;
      return price > stats.referencePrice * 1.27;
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 relative">
      {/* Modal de Visualização de Imagem */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-6xl w-full max-h-screen flex flex-col items-center">
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-slate-300 transition-colors p-2 flex items-center gap-2"
              title="Fechar"
            >
              <span className="text-sm font-medium">Fechar (ESC)</span>
              <X size={24} />
            </button>
            <img 
              src={selectedImage} 
              alt="Visualização Ampliada do Print" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-slate-700 bg-white"
              onClick={(e) => e.stopPropagation()} 
            />
            <div className="mt-4 bg-slate-900/90 text-white px-4 py-2 rounded-full text-sm">
                Verifique: Data, Hora e URL legíveis no print.
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Calculator size={20} className="text-blue-600"/>
              3. Mapa de Preços & Análise Estatística
          </h2>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300 font-mono">
            <Terminal size={12} className={isPythonLoading ? "animate-pulse text-yellow-600" : "text-emerald-600"} />
            {isPythonLoading ? "Processando via Python..." : (stats.engine || "Python 3.10 Engine")}
          </span>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
             <button 
                onClick={() => setShowReferenceInputs(!showReferenceInputs)}
                className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded border border-blue-100"
             >
                <ExternalLink size={12} />
                {showReferenceInputs ? 'Ocultar Histórico' : 'Inserir Ref. Histórica (Power BI)'}
             </button>

             {categories.length > 0 && (
                <div className="relative">
                    <select 
                        className="appearance-none bg-slate-50 border border-slate-300 text-slate-700 py-2 pl-3 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-blue-500 text-sm font-medium"
                        value={selectedCategory || ''}
                        onChange={(e) => setSelectedCategory(e.target.value || null)}
                    >
                        <option value="">Todas as Categorias</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700">
                        <Filter size={14} />
                    </div>
                </div>
             )}
            
            <div className={`px-4 py-2 rounded-lg border ${stats.homogeneityStatus === 'HOMOGENEOUS' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                <div className="text-xs uppercase font-bold tracking-wider">Coeficiente de Variação (CV)</div>
                <div className="text-2xl font-bold flex items-center gap-2">
                    {formatPercent(stats.cv)}
                    {stats.homogeneityStatus === 'HOMOGENEOUS' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                </div>
            </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-50 p-4 rounded-lg border">
          <div className="text-slate-500 text-xs uppercase font-semibold">Média Aritmética</div>
          <div className="text-lg font-bold text-slate-800">{formatCurrency(stats.mean)}</div>
        </div>
        <div className="bg-slate-50 p-4 rounded-lg border">
          <div className="text-slate-500 text-xs uppercase font-semibold">Mediana</div>
          <div className="text-lg font-bold text-slate-800">{formatCurrency(stats.median)}</div>
        </div>
        <div className="bg-slate-50 p-4 rounded-lg border">
          <div className="text-slate-500 text-xs uppercase font-semibold">Desvio Padrão</div>
          <div className="text-lg font-bold text-slate-800">{formatCurrency(stats.stdDev)}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-blue-600 text-xs uppercase font-bold">Preço de Referência</div>
          <div className="text-xl font-bold text-blue-900">{formatCurrency(stats.referencePrice)}</div>
          <div className="text-[10px] text-blue-700 leading-tight mt-1">{stats.methodologyUsed}</div>
        </div>
      </div>

      {/* Python IQR Outlier Analysis Bar */}
      {stats.iqrAnalysis && stats.iqrAnalysis.lower_bound !== null && (
        <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-yellow-600 flex-shrink-0" />
            <span className="font-semibold text-slate-700">Tratamento de Discrepantes (Python IQR):</span>
            <span className="text-slate-600">
              Faixa admissível: <strong>{formatCurrency(stats.iqrAnalysis.lower_bound)}</strong> até <strong>{formatCurrency(stats.iqrAnalysis.upper_bound)}</strong>
              {' '}(IQR: {formatCurrency(stats.iqrAnalysis.iqr || 0)})
            </span>
          </div>
          <div>
            {(stats.outliersCount || 0) > 0 ? (
              <span className="inline-flex items-center gap-1 text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                <AlertTriangle size={12} />
                {stats.outliersCount} cotação(ões) fora do intervalo IQR
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                <CheckCircle size={12} />
                Nenhum outlier detectado pelo método IQR
              </span>
            )}
          </div>
        </div>
      )}

      {/* 27% Alert Box */}
      {isOver27Percent && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r flex flex-col md:flex-row gap-4 items-start">
           <div className="flex items-start gap-3">
               <AlertTriangle className="text-red-600 h-6 w-6 flex-shrink-0 mt-1" />
               <div>
                   <h3 className="font-bold text-red-800 text-sm">Alerta de Variação Excessiva ({'>'} 27%)</h3>
                   <p className="text-xs text-red-700 mt-1">
                       Um ou mais itens apresentam valor superior a 27% do preço de referência calculado (média/mediana). 
                       Conforme regras da DLC, é necessária uma justificativa técnica para manter este preço na cesta.
                   </p>
               </div>
           </div>
           <div className="w-full md:w-1/2">
               <label className="block text-xs font-bold text-red-800 mb-1">Justificativa Obrigatória:</label>
               <textarea 
                  className="w-full border border-red-300 rounded p-2 text-sm text-slate-700 h-20 focus:ring-red-500"
                  placeholder="Ex: Item de marca superior com durabilidade comprovada; Escassez de mercado; Especificidade técnica do lote..."
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
               />
           </div>
        </div>
      )}

      {/* Historical Consistency Suggestions */}
      {hasConsistencyWarnings && (
          <div className="mb-6 bg-orange-50 border border-orange-200 p-4 rounded-lg">
              <h3 className="text-sm font-bold text-orange-800 flex items-center gap-2 mb-3">
                  <Lightbulb size={16} /> Sugestões de Ajuste (Baseado no Histórico Power BI)
              </h3>
              <div className="space-y-2">
                  {consistencyAnalysis.filter(c => c.status === 'WARNING').map((analysis, idx) => (
                      <div key={idx} className="text-xs flex items-center gap-2 text-orange-900 bg-white/50 p-2 rounded">
                          <AlertTriangle size={12} className="text-orange-600" />
                          <span>
                              O item <strong>{analysis.item.sourceName}</strong> (R$ {formatCurrency(analysis.item.priceAdjusted || analysis.item.priceOriginal)}) 
                              está <strong>{Math.abs(analysis.diff).toFixed(1)}% {analysis.diff > 0 ? 'acima' : 'abaixo'}</strong> da referência histórica.
                              <span className="font-bold ml-1">Sugestão: {analysis.diff > 0 ? 'Descartar (Outlier Alto)' : 'Verificar Exequibilidade'}</span>
                          </span>
                      </div>
                  ))}
              </div>
              <div className="mt-3 text-xs text-orange-700">
                  <a href={PROCEMPA_POWERBI_URL} target="_blank" rel="noreferrer" className="underline hover:text-orange-900 flex items-center gap-1">
                     Verificar dados no Power BI <ExternalLink size={10} />
                  </a>
              </div>
          </div>
      )}

      {/* Main Table */}
      <div className="overflow-x-auto border rounded-lg mb-4">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fonte / Data</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Descrição</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Preço (R$)</th>
              
              {showReferenceInputs && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-600 uppercase tracking-wider bg-blue-50">Ref. Histórica (BI)</th>
              )}

              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider" title="Índice de correção">IPCA</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Preço Final</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Print</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200 text-sm">
            {filteredItems.map((item) => {
                const refPrice = item.homologatedReference || item.estimatedReference;
                const diff = refPrice ? (((item.priceAdjusted || item.priceOriginal) - refPrice) / refPrice) * 100 : 0;
                
                return (
                  <tr key={item.id} className={!item.isValid ? "bg-red-50" : "hover:bg-slate-50"}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-slate-900">{item.sourceName}</div>
                      <div className="text-slate-500 text-xs">{item.accessDate}</div>
                      {!item.isValid && <span className="text-xs text-red-600 font-bold block mt-1">{item.rejectionReason}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700 max-w-xs truncate" title={item.productDescription}>{item.productDescription}</div>
                      <div className="flex gap-2 mt-1 text-xs text-slate-400">
                           {item.materialCode && <span className="bg-slate-100 px-1 rounded">COD: {item.materialCode}</span>}
                           {item.category && <span className="bg-slate-100 px-1 rounded">{item.category}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-900">{formatCurrency(item.priceOriginal)}</td>
                    
                    {showReferenceInputs && (
                        <td className="px-4 py-3 bg-blue-50/50">
                            <input 
                                type="number" 
                                className="w-20 border border-blue-200 rounded p-1 text-xs"
                                placeholder="0.00"
                                value={item.homologatedReference || item.estimatedReference || ''}
                                onChange={(e) => onUpdateItem(item.id, { homologatedReference: parseFloat(e.target.value) })}
                            />
                            {refPrice && Math.abs(diff) > 25 && (
                                <div className={`text-[10px] font-bold mt-1 flex items-center gap-1 ${diff > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                    {diff > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                    {Math.abs(diff).toFixed(0)}%
                                </div>
                            )}
                        </td>
                    )}

                    <td className="px-4 py-3">
                       <input 
                          type="number"
                          step="0.01"
                          className="w-14 border rounded p-1 text-xs text-right"
                          placeholder="%"
                          onChange={(e) => {
                             const percent = Number(e.target.value);
                             const factor = 1 + (percent/100);
                             onUpdateIpca(item.id, factor);
                          }}
                       />
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {formatCurrency(item.priceAdjusted || item.priceOriginal)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.printScreen ? (
                        <button 
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs transition-colors"
                          onClick={() => setSelectedImage(`data:image/png;base64,${item.printScreen}`)}
                        >
                            <ZoomIn size={12} /> Ver
                        </button>
                      ) : <span className="text-slate-300 text-xs">-</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => onRemoveItem(item.id)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={showReferenceInputs ? 8 : 7} className="px-4 py-12 text-center text-slate-500">
                  <p className="text-base font-medium">Nenhum preço coletado.</p>
                  <p className="text-sm">Utilize a aba de Pesquisa para adicionar itens.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="flex justify-end">
        <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-800 transition-colors shadow-lg"
        >
            <FileDown size={16} />
            Exportar Planilha (CSV)
        </button>
      </div>

      {/* Chart */}
      {filteredItems.length > 0 && (
        <div className="h-64 w-full mt-8">
            <h3 className="text-sm font-semibold mb-4 text-slate-600">Dispersão de Preços</h3>
            <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filteredItems.filter(i => i.isValid).map(i => ({ name: i.sourceName, price: i.priceAdjusted || i.priceOriginal }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} />
                <YAxis tickFormatter={(val) => `R$ ${val}`} tick={{fontSize: 10}} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} cursor={{fill: '#f1f5f9'}} />
                <Bar dataKey="price" radius={[4, 4, 0, 0]}>
                    {filteredItems.filter(i=>i.isValid).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={stats.homogeneityStatus === 'HOMOGENEOUS' ? '#3b82f6' : '#ef4444'} />
                    ))}
                </Bar>
            </BarChart>
            </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default PriceMap;
