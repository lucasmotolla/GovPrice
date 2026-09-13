import React, { useState, useEffect } from 'react';
import { Terminal, CheckCircle2, AlertCircle, Download, Play, ShieldCheck, FileCode, RefreshCw, Copy, Check, Sparkles, FileText } from 'lucide-react';
import { checkPythonStatus, PythonEngineStatus, validateDomainWithPython, DomainValidationResult, getPythonScriptSource } from '../services/pythonService';
import { formatCurrency, formatPercent } from '../utils/calculations';
import { PriceItem } from '../types';

interface PythonConsoleProps {
  currentItems?: PriceItem[];
}

export const PythonConsole: React.FC<PythonConsoleProps> = ({ currentItems = [] }) => {
  const [engineStatus, setEngineStatus] = useState<PythonEngineStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'outlier_test' | 'url_validator' | 'python_code' | 'gemini_export'>('status');
  const [geminiBundle, setGeminiBundle] = useState<string>('');
  const [geminiCopied, setGeminiCopied] = useState(false);
  
  // URL validator state
  const [testUrl, setTestUrl] = useState('https://www.amazon.com.br/dp/B09XYZ');
  const [urlResult, setUrlResult] = useState<DomainValidationResult | null>(null);
  const [validatingUrl, setValidatingUrl] = useState(false);

  // Interactive tester state
  const [testPrices, setTestPrices] = useState<string>('450.00, 480.00, 510.00, 490.00, 1200.00');
  const [calcResult, setCalcResult] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);

  // Python script source
  const [scriptSource, setScriptSource] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    const status = await checkPythonStatus();
    setEngineStatus(status);
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
    getPythonScriptSource().then(setScriptSource);
  }, []);

  const handleTestUrl = async () => {
    if (!testUrl) return;
    setValidatingUrl(true);
    const result = await validateDomainWithPython(testUrl);
    setUrlResult(result);
    setValidatingUrl(false);
  };

  const handleRunPythonCalc = async () => {
    setCalculating(true);
    try {
      const parsedPrices = testPrices
        .split(/[,;\s]+/)
        .map(p => parseFloat(p.replace('R$', '').trim()))
        .filter(p => !isNaN(p) && p > 0);

      const itemsPayload = parsedPrices.map((p, idx) => ({
        productDescription: `Item de Teste ${idx + 1}`,
        priceOriginal: p,
        isValid: true
      }));

      const res = await fetch('/api/python/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsPayload })
      });
      const data = await res.json();
      setCalcResult(data);
    } catch (err: any) {
      setCalcResult({ error: err.message });
    } finally {
      setCalculating(false);
    }
  };

  const handleDownloadPythonScript = () => {
    const blob = new Blob([scriptSource], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'govprice_pesquisa_precos.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(scriptSource);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xl text-slate-200">
      {/* Header */}
      <div className="bg-slate-950 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400">
            <Terminal size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">Motor de Processamento Python 3.10</h3>
              <span className="bg-blue-600/30 text-blue-300 text-xs px-2 py-0.5 rounded border border-blue-500/30 font-mono">
                Python Core
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Cálculo estatístico amostral, expurgo de outliers (IQR) e validação de sítios segundo a IN 65/2021
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {engineStatus?.status === 'ok' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 size={13} className="text-emerald-400" />
              Engine Ativo (Python 3.10)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/30">
              <AlertCircle size={13} />
              Engine em Inicialização
            </span>
          )}

          <button
            onClick={fetchStatus}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-white rounded bg-slate-800 hover:bg-slate-700 transition-colors"
            title="Atualizar status"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 px-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab('status')}
          className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'status'
              ? 'border-yellow-400 text-yellow-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal size={14} />
          Diagnóstico do Motor
        </button>
        <button
          onClick={() => setActiveTab('outlier_test')}
          className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'outlier_test'
              ? 'border-yellow-400 text-yellow-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Play size={14} />
          Testador de Tratamento Estatístico
        </button>
        <button
          onClick={() => setActiveTab('url_validator')}
          className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'url_validator'
              ? 'border-yellow-400 text-yellow-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck size={14} />
          Validador de Sítios Seguros
        </button>
        <button
          onClick={() => setActiveTab('python_code')}
          className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'python_code'
              ? 'border-yellow-400 text-yellow-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCode size={14} />
          Código-Fonte Python (.py)
        </button>
        <button
          onClick={() => {
            setActiveTab('gemini_export');
            if (!geminiBundle) {
              fetch('/govprice_full_code_for_gemini.md')
                .then(r => r.text())
                .then(setGeminiBundle)
                .catch(() => setGeminiBundle('# Erro ao carregar arquivo de exportação.'));
            }
          }}
          className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'gemini_export'
              ? 'border-blue-400 text-blue-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles size={14} className="text-blue-400" />
          Exportar p/ Gemini (.md / .txt)
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'status' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4">
                <div className="text-xs text-slate-400 uppercase font-semibold">Interpretador Python</div>
                <div className="text-lg font-bold text-white mt-1">Python 3.10.12</div>
                <div className="text-xs text-slate-500 mt-1 font-mono">Linux Standard Environment</div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4">
                <div className="text-xs text-slate-400 uppercase font-semibold">Módulos em Execução</div>
                <div className="text-sm font-semibold text-emerald-400 mt-1 flex flex-col gap-1">
                  <span>• statistical_engine.py (IN 65)</span>
                  <span>• safe_search_engine.py (Domínio Amplo)</span>
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
                <div>
                  <div className="text-xs text-slate-400 uppercase font-semibold">Script CLI Autônomo</div>
                  <div className="text-xs text-slate-300 mt-1">Disponível para download e execução em terminal offline.</div>
                </div>
                <button
                  onClick={handleDownloadPythonScript}
                  className="mt-3 inline-flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold px-3 py-1.5 rounded text-xs transition-colors"
                >
                  <Download size={14} />
                  Baixar govprice_pesquisa_precos.py
                </button>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 space-y-2">
              <div className="text-slate-500"># Verificação de conformidade do motor Python:</div>
              <div className="text-emerald-400">&gt;&gt;&gt; import statistical_engine, safe_search_engine</div>
              <div className="text-slate-400">
                [OK] Regra 1: Preço de referência = min(Média, Mediana) conforme praxe de Porto Alegre e art. 23 da Lei 14.133/2021.
              </div>
              <div className="text-slate-400">
                [OK] Regra 2: Coeficiente de Variação (CV%) limite de 25% (TCU Acórdão 1443/2014 - Plenário).
              </div>
              <div className="text-slate-400">
                [OK] Regra 3: Expurgo de outliers pelo método IQR [Q1 - 1.5*IQR, Q3 + 1.5*IQR].
              </div>
              <div className="text-slate-400">
                [OK] Regra 4: Filtro de sítios de domínio amplo seguro (bloqueio de C2C/Shopee/OLX, limite de 1 preço por domínio).
              </div>
            </div>
          </div>
        )}

        {activeTab === 'outlier_test' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Valores de Cotações para Teste Amostral (R$ separados por vírgula):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testPrices}
                  onChange={(e) => setTestPrices(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-yellow-400 focus:outline-none"
                  placeholder="Ex: 100, 105, 98, 102, 350 (outlier)"
                />
                <button
                  onClick={handleRunPythonCalc}
                  disabled={calculating}
                  className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Play size={16} />
                  {calculating ? 'Executando Python...' : 'Calcular via Python'}
                </button>
              </div>
            </div>

            {calcResult && (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-yellow-400 font-bold">Saída do Processamento Python:</span>
                  <span className="text-slate-500 text-[11px]">{calcResult.engine || 'Python 3.10'}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-300">
                  <div>
                    <span className="text-slate-500 block">Média:</span>
                    <span className="text-white font-bold">{formatCurrency(calcResult.mean || 0)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Mediana:</span>
                    <span className="text-white font-bold">{formatCurrency(calcResult.median || 0)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Desvio Padrão:</span>
                    <span className="text-white font-bold">{formatCurrency(calcResult.stdDev || 0)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">CV (Variação):</span>
                    <span className={`font-bold ${calcResult.homogeneityStatus === 'HOMOGENEOUS' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatPercent(calcResult.cv || 0)} ({calcResult.homogeneityStatus === 'HOMOGENEOUS' ? 'Homogênea' : 'Heterogênea'})
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-900 border border-slate-800 rounded">
                  <span className="text-yellow-300 font-semibold block mb-1">Preço de Referência Escolhido:</span>
                  <div className="text-xl font-bold text-white">
                    {formatCurrency(calcResult.referencePrice || 0)}
                  </div>
                  <span className="text-[11px] text-slate-400">{calcResult.methodologyUsed}</span>
                </div>

                {calcResult.iqrAnalysis && calcResult.iqrAnalysis.lower_bound !== null && (
                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded text-[11px] text-slate-300">
                    <span className="text-blue-400 font-semibold block mb-1">Análise de Outliers (IQR):</span>
                    <div>• Limite Inferior: {formatCurrency(calcResult.iqrAnalysis.lower_bound)}</div>
                    <div>• Limite Superior: {formatCurrency(calcResult.iqrAnalysis.upper_bound)}</div>
                    <div>• Outliers Detectados: {calcResult.outliersCount} item(ns) fora da faixa aceitável</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'url_validator' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                URL ou Domínio para Verificação de Segurança (IN 65/2021):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-yellow-400 focus:outline-none"
                  placeholder="https://exemplo.com.br/produto"
                />
                <button
                  onClick={handleTestUrl}
                  disabled={validatingUrl}
                  className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <ShieldCheck size={16} />
                  {validatingUrl ? 'Checando...' : 'Validar Sítio'}
                </button>
              </div>
            </div>

            {urlResult && (
              <div className={`p-4 rounded-lg border font-mono text-xs ${
                urlResult.status === 'APPROVED'
                  ? 'bg-emerald-950/60 border-emerald-700/50 text-emerald-200'
                  : urlResult.status === 'PROHIBITED'
                  ? 'bg-red-950/60 border-red-700/50 text-red-200'
                  : 'bg-amber-950/60 border-amber-700/50 text-amber-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm">
                    {urlResult.status === 'APPROVED' && '✓ SÍTIO APROVADO PARA PESQUISA PÚBLICA'}
                    {urlResult.status === 'PROHIBITED' && '✗ VEDADO PELA LEI 14.133 / IN 65'}
                    {urlResult.status === 'MANUAL_REVIEW' && '⚠ REQUER VERIFICAÇÃO MANUAL DE CNPJ / NOTA FISCAL'}
                  </span>
                  {urlResult.score !== undefined && (
                    <span className="px-2 py-0.5 rounded bg-black/40 font-semibold">
                      Score: {urlResult.score}/100
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <div><strong>Domínio:</strong> {urlResult.domain}</div>
                  {urlResult.name && <div><strong>Razão/Nome:</strong> {urlResult.name}</div>}
                  {urlResult.notes && <div><strong>Regra:</strong> {urlResult.notes}</div>}
                  <div className="mt-2 text-[11px] opacity-90">{urlResult.message}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'python_code' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Código Python executável autônomo (<code>govprice_pesquisa_precos.py</code>):
              </span>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleCopyScript}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  {copied ? 'Copiado!' : 'Copiar Código'}
                </button>
                <button
                  onClick={handleDownloadPythonScript}
                  className="px-3 py-1 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Download size={14} />
                  Baixar .py
                </button>
                <a
                  href="/api/export/zip"
                  download="govprice_projeto_completo.zip"
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs flex items-center gap-1.5 transition-colors"
                  title="Baixar projeto completo em .zip"
                >
                  <Download size={14} />
                  Baixar Projeto (.zip)
                </a>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 max-h-80 overflow-y-auto font-mono text-xs text-slate-300">
              <pre>{scriptSource || '# Carregando script Python...'}</pre>
            </div>
          </div>
        )}

        {activeTab === 'gemini_export' && (
          <div className="space-y-4">
            <div className="bg-blue-950/40 border border-blue-800/60 rounded-lg p-4 text-xs text-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-white flex items-center gap-1.5 text-sm mb-1">
                  <Sparkles size={16} className="text-blue-400" />
                  Código Unificado para Contexto do Gemini (Single-Prompt Context)
                </div>
                <p className="text-slate-300">
                  Todo o código-fonte (Python 3.10, Node/Express, React, TypeScript, cálculos da IN 65/2021) compilado em um documento único formatado em Markdown com delimitação de arquivos para você colar diretamente ou anexar ao Google Gemini.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(geminiBundle);
                    setGeminiCopied(true);
                    setTimeout(() => setGeminiCopied(false), 2500);
                  }}
                  className={`px-3.5 py-2 rounded-md font-bold text-xs flex items-center gap-1.5 transition-all shadow-md ${
                    geminiCopied ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {geminiCopied ? <Check size={14} /> : <Copy size={14} />}
                  {geminiCopied ? 'Copiado para o Gemini!' : 'Copiar Tudo p/ Área de Transferência'}
                </button>
                <a
                  href="/govprice_full_code_for_gemini.md"
                  download="govprice_full_code_for_gemini.md"
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
                  title="Baixar em formato Markdown (.md) para anexar ao Gemini"
                >
                  <Download size={14} />
                  Baixar .md
                </a>
                <a
                  href="/govprice_full_code_for_gemini.txt"
                  download="govprice_full_code_for_gemini.txt"
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
                  title="Baixar em formato Texto Puro (.txt) para anexar ao Gemini"
                >
                  <FileText size={14} />
                  Baixar .txt
                </a>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
              <span>
                Documento compilado: <strong>29 arquivos</strong> (~172 KB / ~43.000 tokens)
              </span>
              <span className="text-emerald-400 font-semibold">
                Compatível com Gemini 1.5 Pro, 1.5 Flash e 2.0 (Janela de 1M - 2M tokens)
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-[11px] leading-relaxed text-slate-300 select-all">
              <pre>{geminiBundle || '# Carregando pacote de arquivos para o Gemini...'}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PythonConsole;
