
import React, { useState } from 'react';
import { Search, ExternalLink, Loader2, Building2, Globe, CheckCircle2, Clipboard, History, TrendingUp, TrendingDown, Minus, Filter, AlertCircle, Layers, BarChart3 } from 'lucide-react';
import { findProductLinks } from '../services/geminiService';
import { SearchParams, SearchResultItem, AccessLogItem } from '../types';
import { PUBLIC_DATA_SOURCES, PROCEMPA_POWERBI_URL } from '../constants';

interface SearchAssistantProps {
  onStatsUpdate: (stats: any) => void;
}

const SearchAssistant: React.FC<SearchAssistantProps> = () => {
  const [params, setParams] = useState<SearchParams>({
    term: '',
    minPrice: undefined,
    maxPrice: undefined,
    homologatedPrice: undefined,
    estimatedPrice: undefined,
    dateRange: '180'
  });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [accessLog, setAccessLog] = useState<AccessLogItem[]>([]);
  const [stabilityFilter, setStabilityFilter] = useState<'ALL' | 'STABLE' | 'HIGH' | 'LOW'>('ALL');

  const parsePrice = (priceStr: string): number => {
    if (!priceStr) return 0;
    try {
        let clean = priceStr.replace(/[^\d.,]/g, '');
        if (clean.includes(',') && clean.includes('.')) {
             clean = clean.replace('.', '').replace(',', '.');
        } else if (clean.includes(',')) {
             clean = clean.replace(',', '.');
        }
        return parseFloat(clean) || 0;
    } catch (e) {
        return 0;
    }
  };

  const handleSearch = async () => {
    if (!params.term) return;
    
    // Split terms by newline or comma and clean up
    const searchTerms = params.term.split(/[\n,]+/)
        .map(t => t.trim())
        .filter(t => t.length > 0);

    if (searchTerms.length === 0) return;

    if (searchTerms.length > 20) {
        alert(`Limite de 20 produtos por vez excedido. Você inseriu ${searchTerms.length} itens. Por favor, reduza a lista.`);
        return;
    }

    setLoading(true);
    setResults([]); 
    setProgress({ current: 0, total: searchTerms.length });
    
    let allResults: SearchResultItem[] = [];

    for (let i = 0; i < searchTerms.length; i++) {
        const term = searchTerms[i];
        setProgress({ current: i + 1, total: searchTerms.length });

        // Pass both prices to the service
        const prices = {
            homologated: params.homologatedPrice,
            estimated: params.estimatedPrice
        };

        const rawItems = await findProductLinks(term, prices, params.dateRange);
        
        // Add query context to results
        const itemsWithQuery = rawItems.map(item => ({ ...item, query: term }));
        
        allResults = [...allResults, ...itemsWithQuery];
    }
    
    // Intelligent Sorting: Use Homologated as primary anchor, or Estimated if Homologated is missing
    const anchorPrice = params.homologatedPrice || params.estimatedPrice;

    let sortedItems = allResults;
    if (anchorPrice && anchorPrice > 0 && searchTerms.length === 1) {
        sortedItems = allResults.sort((a, b) => {
            const priceA = parsePrice(a.price || '0');
            const priceB = parsePrice(b.price || '0');
            const devA = Math.abs(priceA - anchorPrice);
            const devB = Math.abs(priceB - anchorPrice);
            return devA - devB;
        });
    }

    setResults(sortedItems);
    setLoading(false);
    setProgress({ current: 0, total: 0 });
  };

  const handleVisit = (index: number) => {
    const item = filteredResults[index];
    const mainIndex = results.findIndex(r => r.url === item.url && r.title === item.title);

    if (mainIndex === -1) return;
    
    const newLogEntry: AccessLogItem = {
        url: item.url,
        source: item.source,
        product: item.title,
        timestamp: new Date().toLocaleString('pt-BR')
    };
    setAccessLog(prev => [newLogEntry, ...prev]);

    const newResults = [...results];
    newResults[mainIndex].visited = true;
    setResults(newResults);

    window.open(item.url, '_blank');
  };

  const copyLink = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const copyLogTable = () => {
    const header = "Data/Hora\tFonte\tProduto\tLink\n";
    const body = accessLog.map(l => `${l.timestamp}\t${l.source}\t${l.product}\t${l.url}`).join("\n");
    navigator.clipboard.writeText(header + body);
    alert("Tabela de histórico copiada! Cole no Excel ou Word.");
  };

  const getPriceStatus = (priceStr: string | undefined) => {
     const anchor = params.homologatedPrice || params.estimatedPrice;
     if (!priceStr || !anchor) return 'UNKNOWN';
     
     const price = parsePrice(priceStr);
     if (price === 0) return 'UNKNOWN';
     
     const diffPercent = ((price - anchor) / anchor) * 100;
     
     if (Math.abs(diffPercent) <= 20) return 'STABLE'; // within 20% of anchor
     if (diffPercent > 20) return 'HIGH';
     return 'LOW';
  };

  const getPriceAnalysis = (priceStr: string | undefined) => {
      const status = getPriceStatus(priceStr);
      const anchor = params.homologatedPrice || params.estimatedPrice;

      if (status === 'UNKNOWN' || !anchor) return null;
      
      const price = parsePrice(priceStr || '0');
      const diffPercent = ((price - anchor) / anchor) * 100;

      if (status === 'STABLE') {
          return <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded flex items-center gap-1 border border-green-200 font-bold"><Minus size={10}/> Estável ({diffPercent > 0 ? '+' : ''}{diffPercent.toFixed(0)}%)</span>;
      } else if (status === 'HIGH') {
          return <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded flex items-center gap-1 border border-red-200 font-bold"><TrendingUp size={10}/> Alta ({diffPercent > 0 ? '+' : ''}{diffPercent.toFixed(0)}%)</span>;
      } else {
          return <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-1 border border-blue-200 font-bold"><TrendingDown size={10}/> Queda ({diffPercent.toFixed(0)}%)</span>;
      }
  };

  const filteredResults = results.filter(item => {
      if (stabilityFilter === 'ALL') return true;
      const status = getPriceStatus(item.price);
      return status === stabilityFilter;
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Search className="text-blue-600" size={20} />
          1. Pesquisa de Preços (Fontes Públicas & Privadas)
        </h2>
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">IN 001/2025</span>
      </div>

      {/* Public Sources Section */}
      <div className="mb-6 bg-blue-50 border border-blue-100 p-4 rounded-lg">
        <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2 mb-2">
            <Building2 size={16} /> Prioridade 1: Fontes Públicas
        </h3>
        <p className="text-xs text-blue-700 mb-3">
            A legislação exige que a pesquisa inicie por contratações similares (Licitacon, Painel de Preços).
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {PUBLIC_DATA_SOURCES.map((source, idx) => (
                <a 
                    key={idx} 
                    href={source.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1 text-xs bg-white border border-blue-200 text-blue-700 py-2 px-2 rounded hover:bg-blue-100 transition-colors text-center"
                >
                    {source.name} <ExternalLink size={10} />
                </a>
            ))}
        </div>
      </div>

      {/* Private Sources Search */}
      <div className="border-t border-slate-200 pt-6">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
            <Globe size={16} className="text-emerald-600" /> 
            Prioridade 2: Sítios de Domínio Amplo (Busca Inteligente)
        </h3>
        <p className="text-sm text-slate-600 mb-4">
            O sistema busca produtos em sites da Whitelist, filtrando por data e valor de referência.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 items-start">
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Produto(s) Alvo
                    <span className="text-xs text-slate-400 font-normal ml-2">(Separe múltiplos produtos por vírgula ou nova linha. Máx 20)</span>
                </label>
                <textarea
                    className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border min-h-[120px] text-sm"
                    placeholder="Ex: Caderno escolar 100 folhas capa dura"
                    value={params.term}
                    onChange={(e) => setParams({ ...params, term: e.target.value })}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) handleSearch();
                    }}
                />
                <p className="text-[10px] text-slate-400 mt-1">Pressione Ctrl + Enter para pesquisar</p>
            </div>
            <div className="space-y-3">
                 
                 {/* Dual Price Inputs for Power BI */}
                 <div className="bg-slate-50 p-3 rounded border border-slate-200">
                    <div className="flex justify-between items-center mb-2">
                         <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                            <BarChart3 size={12} /> Referências Power BI
                         </span>
                         <a href={PROCEMPA_POWERBI_URL} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5">
                            Acessar <ExternalLink size={8}/>
                         </a>
                    </div>
                    
                    <div className="mb-2">
                        <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Valor Homologado (Última Compra)</label>
                        <input
                            type="number"
                            className="w-full border-slate-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 p-1.5 border text-sm"
                            placeholder="R$ 0,00"
                            value={params.homologatedPrice || ''}
                            onChange={(e) => setParams({ ...params, homologatedPrice: parseFloat(e.target.value) })}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Valor Estimado (Média Mercado)</label>
                        <input
                            type="number"
                            className="w-full border-slate-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 p-1.5 border text-sm"
                            placeholder="R$ 0,00"
                            value={params.estimatedPrice || ''}
                            onChange={(e) => setParams({ ...params, estimatedPrice: parseFloat(e.target.value) })}
                        />
                    </div>
                 </div>
                 
                 <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Período da Pesquisa (Validade)</label>
                    <select
                        className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border text-sm"
                        value={params.dateRange}
                        onChange={(e: any) => setParams({ ...params, dateRange: e.target.value })}
                    >
                        <option value="30">Últimos 30 dias (Prioritário)</option>
                        <option value="60">Últimos 60 dias</option>
                        <option value="90">Últimos 90 dias</option>
                        <option value="180">Últimos 180 dias (Limite IN 65/21)</option>
                    </select>
                 </div>

                 <button
                    onClick={handleSearch}
                    disabled={loading || !params.term}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md flex justify-center items-center transition-colors disabled:opacity-50 gap-2 shadow-sm"
                >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                    {loading ? `Buscando (${progress.current}/${progress.total})...` : 'Busca Inteligente'}
                </button>
            </div>
        </div>

        {/* Filters Bar */}
        {results.length > 0 && (
             <div className="flex items-center gap-2 mb-4 bg-slate-100 p-2 rounded-md flex-wrap">
                <Filter size={14} className="text-slate-500" />
                <span className="text-xs font-semibold text-slate-600 mr-2">
                    Comparando com: {params.homologatedPrice ? `Homologado (R$ ${params.homologatedPrice.toFixed(2)})` : (params.estimatedPrice ? `Estimado (R$ ${params.estimatedPrice.toFixed(2)})` : 'Sem referência')}
                </span>
                <div className="flex gap-1">
                    {[
                        { id: 'ALL', label: 'Todos' },
                        { id: 'STABLE', label: 'Estáveis (±20%)' },
                        { id: 'LOW', label: 'Abaixo Ref.' },
                        { id: 'HIGH', label: 'Acima Ref.' }
                    ].map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => setStabilityFilter(opt.id as any)}
                            className={`px-3 py-1 rounded-full text-[10px] font-medium transition-colors ${
                                stabilityFilter === opt.id 
                                ? 'bg-white text-blue-700 shadow border border-blue-200' 
                                : 'text-slate-500 hover:bg-white/50'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
             </div>
        )}

        {/* Results List */}
        {filteredResults.length > 0 && (
            <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden mb-6">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700 uppercase">Resultados ({filteredResults.length})</span>
                    <span className="text-xs text-slate-500">Use "Visitar" para acessar e capturar</span>
                </div>
                <div className="divide-y divide-slate-200">
                    {filteredResults.map((item, idx) => (
                        <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-white transition-colors gap-3">
                            <div className="flex-grow pr-4">
                                {/* Query Badge */}
                                {item.query && (
                                    <div className="mb-1">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                                            <Layers size={10} /> {item.query}
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="font-bold text-slate-800 text-sm">{item.source}</span>
                                    {item.price && (
                                        <span className="text-xs bg-white border border-slate-200 text-slate-800 px-2 py-0.5 rounded font-medium">
                                            {item.price}
                                        </span>
                                    )}
                                    {getPriceAnalysis(item.price)}
                                </div>
                                <p className="text-sm text-slate-600 line-clamp-2 font-medium" title={item.title}>
                                    {item.title}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                     <p className="text-xs text-slate-400 truncate max-w-xs">{item.url}</p>
                                     <button onClick={() => copyLink(item.url)} className="text-slate-300 hover:text-blue-500" title="Copiar Link">
                                        <Clipboard size={12} />
                                     </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                                {item.visited && (
                                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                        <CheckCircle2 size={14} /> Visitado
                                    </span>
                                )}
                                <button
                                    onClick={() => handleVisit(idx)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium border transition-all ${
                                        item.visited 
                                            ? 'bg-slate-100 text-slate-600 border-slate-300' 
                                            : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50 shadow-sm'
                                    }`}
                                >
                                    Visitar Site <ExternalLink size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
        
        {/* Access Log Table */}
        {accessLog.length > 0 && (
             <div className="mt-6 border-t pt-6">
                 <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <History size={16} /> Diário de Navegação (Links Visitados)
                    </h3>
                    <button onClick={copyLogTable} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        <Clipboard size={12} /> Copiar Tabela
                    </button>
                 </div>
                 <div className="overflow-x-auto border rounded-lg max-h-60 overflow-y-auto">
                     <table className="min-w-full divide-y divide-slate-200">
                         <thead className="bg-slate-50 sticky top-0">
                             <tr>
                                 <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Data/Hora</th>
                                 <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Fonte</th>
                                 <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Produto</th>
                                 <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">Link</th>
                             </tr>
                         </thead>
                         <tbody className="bg-white divide-y divide-slate-200 text-xs">
                             {accessLog.map((log, i) => (
                                 <tr key={i}>
                                     <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{log.timestamp}</td>
                                     <td className="px-3 py-2 text-slate-800 font-medium">{log.source}</td>
                                     <td className="px-3 py-2 text-slate-600 truncate max-w-xs" title={log.product}>{log.product}</td>
                                     <td className="px-3 py-2 text-right">
                                         <a href={log.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline truncate inline-block max-w-[150px]">
                                             {log.url}
                                         </a>
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
             </div>
        )}

        {results.length === 0 && !loading && params.term && (
             <div className="text-center py-8 text-slate-500 text-sm italic flex flex-col items-center gap-2">
                <AlertCircle size={24} className="text-slate-300"/>
                <span>Nenhum resultado específico encontrado. Verifique os filtros de preço ou data.</span>
            </div>
        )}
      </div>
    </div>
  );
};

export default SearchAssistant;
