
import React, { useState } from 'react';
import { FileText, ArrowRight, Copy, Check, ExternalLink, ClipboardList, ShoppingCart } from 'lucide-react';
import { NOVOREM_URL } from '../constants';

const PlanningAssistant: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ETP' | 'TR' | 'REM'>('ETP');
  const [copied, setCopied] = useState(false);

  // ETP State
  const [etpData, setEtpData] = useState({
    necessidade: '',
    quantidade: '',
    solucao: '',
    viabilidade: 'Declaramos a viabilidade técnica e econômica da contratação.',
    parcelamento: 'O objeto será contratado em lote único para garantir padronização e economia de escala.'
  });

  // TR State
  const [trData, setTrData] = useState({
    objeto: '',
    entrega: 'Prazo de 30 dias após empenho. Local: Almoxarifado Central.',
    garantia: '12 meses contra defeitos de fabricação.',
    pagamento: 'Pagamento em até 30 dias após liquidação da nota fiscal.'
  });

  const generateText = () => {
    if (activeTab === 'ETP') {
      return `ESTUDO TÉCNICO PRELIMINAR (SIMPLIFICADO - Dec. 21.859/23)

1. DESCRIÇÃO DA NECESSIDADE
${etpData.necessidade || '[Descrever o problema a ser resolvido]'}

2. ESTIMATIVA DE QUANTIDADES
${etpData.quantidade || '[Inserir memória de cálculo ou histórico de consumo]'}

3. LEVANTAMENTO DE MERCADO
Foi realizada pesquisa de preços conforme IN 001/2025, priorizando fontes públicas e sítios de domínio amplo.

4. DEFINIÇÃO DA SOLUÇÃO
${etpData.solucao || '[Descrever a solução escolhida]'}

5. JUSTIFICATIVA DE PARCELAMENTO
${etpData.parcelamento}

6. DECLARAÇÃO DE VIABILIDADE
${etpData.viabilidade}`;
    } else if (activeTab === 'TR') {
      return `TERMO DE REFERÊNCIA

1. OBJETO
${trData.objeto || '[Descrição completa do material conforme GMAT]'}

2. MODELO DE EXECUÇÃO / ENTREGA
${trData.entrega}

3. GARANTIA E SUPORTE
${trData.garantia}

4. CRITÉRIOS DE PAGAMENTO
${trData.pagamento}

5. ADEQUAÇÃO ORÇAMENTÁRIA
A despesa corre por conta das dotações orçamentárias próprias da pasta.`;
    }
    return '';
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <ClipboardList className="text-blue-600" size={20} />
          0. Assistente de Planejamento (Fase Interna)
        </h2>
        <div className="flex bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('ETP')}
            className={`px-3 py-1 text-sm rounded-md font-medium transition-all ${activeTab === 'ETP' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
          >
            1. ETP
          </button>
          <button
            onClick={() => setActiveTab('TR')}
            className={`px-3 py-1 text-sm rounded-md font-medium transition-all ${activeTab === 'TR' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
          >
            2. Termo de Ref.
          </button>
          <button
            onClick={() => setActiveTab('REM')}
            className={`px-3 py-1 text-sm rounded-md font-medium transition-all ${activeTab === 'REM' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
          >
            3. Sistema REM
          </button>
        </div>
      </div>

      {activeTab === 'ETP' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded border border-blue-100">
            <strong>Dica DLC:</strong> O ETP é obrigatório para compras (exceto dispensa por valor e prorrogações). Foque na "Necessidade" e "Estimativa".
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição da Necessidade</label>
              <textarea 
                className="w-full border border-slate-300 rounded-md p-2 text-sm h-20"
                placeholder="Ex: Aquisição de material de expediente para reposição do estoque trimestral..."
                value={etpData.necessidade}
                onChange={e => setEtpData({...etpData, necessidade: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estimativa de Quantidade (Memória de Cálculo)</label>
              <textarea 
                className="w-full border border-slate-300 rounded-md p-2 text-sm h-20"
                placeholder="Ex: Baseado no consumo médio de 2023 (Relatório BI Procempa) + 10% de margem..."
                value={etpData.quantidade}
                onChange={e => setEtpData({...etpData, quantidade: e.target.value})}
              />
            </div>
          </div>
          <div className="flex justify-end">
             <button onClick={handleCopy} className="flex items-center gap-2 text-sm bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-700 transition-colors">
                {copied ? <Check size={16} /> : <Copy size={16} />}
                Copiar Rascunho ETP
             </button>
          </div>
        </div>
      )}

      {activeTab === 'TR' && (
        <div className="space-y-4 animate-in fade-in">
           <div className="p-3 bg-indigo-50 text-indigo-800 text-xs rounded border border-indigo-100">
            <strong>Importante:</strong> O TR deve espelhar as especificações do GMAT. Não inclua marca ou modelo sem justificativa técnica robusta (padronização).
          </div>
           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Objeto (Conforme GMAT)</label>
              <input 
                className="w-full border border-slate-300 rounded-md p-2 text-sm"
                placeholder="Cole aqui a descrição exata do catálogo..."
                value={trData.objeto}
                onChange={e => setTrData({...trData, objeto: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Condições de Entrega</label>
                    <input 
                        className="w-full border border-slate-300 rounded-md p-2 text-sm"
                        value={trData.entrega}
                        onChange={e => setTrData({...trData, entrega: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Garantia</label>
                    <input 
                        className="w-full border border-slate-300 rounded-md p-2 text-sm"
                        value={trData.garantia}
                        onChange={e => setTrData({...trData, garantia: e.target.value})}
                    />
                </div>
            </div>
            <div className="flex justify-end">
             <button onClick={handleCopy} className="flex items-center gap-2 text-sm bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-700 transition-colors">
                {copied ? <Check size={16} /> : <Copy size={16} />}
                Copiar Rascunho TR
             </button>
          </div>
        </div>
      )}

      {activeTab === 'REM' && (
        <div className="space-y-5 animate-in fade-in text-center py-4">
             <div className="flex justify-center mb-4">
                <ShoppingCart className="h-12 w-12 text-emerald-500" />
             </div>
             
             <h3 className="text-lg font-bold text-slate-800">Formalizar Requisição no Novorem</h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-2xl mx-auto mb-6">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <span className="block font-bold text-slate-700 mb-1">RM Tipo 1 (Licitação)</span>
                    <p className="text-xs text-slate-600">
                        Utilize quando o item estiver <strong>ATIVO</strong> no GMAT mas <strong>SEM Registro de Preço</strong> vigente. 
                        Gera processo de compra (Pregão/Dispensa).
                    </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <span className="block font-bold text-slate-700 mb-1">RM Tipo 2 (Registro de Preço)</span>
                    <p className="text-xs text-slate-600">
                        Utilize quando o item tiver <strong>ATA VIGENTE</strong>. O sistema processa a compra diretamente com o fornecedor registrado.
                    </p>
                </div>
             </div>

             <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg text-sm text-emerald-800 mb-6">
                Lembre-se: Antes de criar a RM, verifique se o código do material está correto no GMAT.
             </div>

             <a 
                href={NOVOREM_URL} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-emerald-700 transition-all shadow-md"
             >
                Acessar Sistema Novorem <ExternalLink size={18} />
             </a>
        </div>
      )}
    </div>
  );
};

export default PlanningAssistant;
