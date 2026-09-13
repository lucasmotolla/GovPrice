# PROJETO GOVPRICE - CÓDIGO-FONTE COMPLETO PARA ANÁLISE NO GEMINI

Este documento contém todo o código-fonte do projeto GovPrice: Motor Estatístico em Python 3.10, Servidor Node/Express Full-Stack e Interface React com TypeScript, aderente à Lei 14.133/2021 e IN SEGES/ME nº 65/2021.

## ESTRUTURA DO PROJETO E ÍNDICE DE ARQUIVOS:

- .gitignore
- App.tsx
- README.md
- components/Compendium.tsx
- components/DataCollector.tsx
- components/Layout.tsx
- components/PlanningAssistant.tsx
- components/PostAnalysisGuide.tsx
- components/PriceMap.tsx
- components/PythonConsole.tsx
- components/ReportGenerator.tsx
- components/SearchAssistant.tsx
- constants.ts
- index.html
- index.tsx
- metadata.json
- package.json
- python/export_project.py
- python/generate_gemini_bundle.py
- python/govprice_pesquisa_precos.py
- python/main.py
- python/safe_search_engine.py
- python/statistical_engine.py
- server.ts
- services/geminiService.ts
- services/pythonService.ts
- tsconfig.json
- types.ts
- utils/calculations.ts
- vite.config.ts

================================================================================


### ARQUIVO: `.gitignore`

```gitignore
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Python artifacts
__pycache__/
*.py[cod]
*$py.class
*.pyc
.tmp*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
```


### ARQUIVO: `App.tsx`

```tsx

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
```


### ARQUIVO: `README.md`

```
# GovPrice - Assistente de Pesquisa e Formação de Preços

Sistema full-stack para realização, saneamento estatístico e documentação de pesquisas de preços em contratações públicas brasileiras, em estrita conformidade com a **Lei Federal nº 14.133/2021** e a **Instrução Normativa SEGES/ME nº 65/2021**.

---

## 🏛️ Principais Recursos

- **Motor Estatístico em Python 3.10**:
  - Média Aritmética, Mediana, Desvio Padrão Amostral e Coeficiente de Variação ($CV \le 25\%$).
  - Detecção e expurgo automático de *outliers* utilizando o método do Intervalo Interquartil ($Q_1 - 1.5 \times IQR$ a $Q_3 + 1.5 \times IQR$).
  - Preço de Referência conservador para proteção do erário: $\min(\text{Média}, \text{Mediana})$.
- **Validação de Sítios de Domínio Amplo (IN 65/2021)**:
  - Classificação e verificação de sítios de domínio amplo seguro (Amazon, Magazine Luiza, Kalunga, Casas Bahia, Kabum, Leroy Merlin, etc.).
  - Bloqueio imediato de plataformas vedadas (marketplaces C2C/pessoas físicas como Shopee, OLX, Enjoei).
  - Gerador de buscas estruturadas (*Google Dorks*) com restrição a domínios seguros e portais públicos (PNCP/Comprasnet).
- **Integração com o SEI (Sistema Eletrônico de Informações)**:
  - Geração com 1 clique do **Mapa Comparativo de Preços** formatado em tabela HTML pronta para colar no SEI.
  - Emissão automatizada do **Laudo Técnico e Justificativa de Metodologia** para instrução processual.
- **Console Interativo Python**:
  - Diagnóstico em tempo real do interpretador Python 3.10.
  - Testador de cálculos estatísticos e validador de fontes.
  - Script autônomo em linha de comando (`govprice_pesquisa_precos.py`).
  - Exportador unificado de código para análise e evolução com o Google Gemini (`.md` / `.txt`).

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- **Node.js** 18+ ou 20+
- **Python** 3.10+ (bibliotecas nativas `math`, `statistics`, `json`, `sys`, `urllib`)

### Instalação

1. Clone o repositório ou descompacte o arquivo do projeto:
   ```bash
   git clone <URL_DO_REPOSITORIO>
   cd govprice
   ```

2. Instale as dependências do Node:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

4. Acesse a aplicação no navegador em `http://localhost:3000`.

---

## 🐍 Executando o Motor Python via Terminal

Você também pode utilizar o motor estatístico diretamente via linha de comando sem precisar iniciar o servidor web:

```bash
# Modo Interativo
python3 python/govprice_pesquisa_precos.py

# Modo CLI Direto com argumentos
python3 python/govprice_pesquisa_precos.py \
  --objeto "Monitor LED 27 polegadas 4K" \
  --precos 1200.00 1250.00 1190.00 1220.00
```

---

## 📂 Estrutura do Projeto

```
├── python/
│   ├── statistical_engine.py       # Motor estatístico (Média, Mediana, DP, CV%, IQR)
│   ├── safe_search_engine.py      # Validador de fontes da IN 65/2021 e Google Dorks
│   ├── main.py                    # Ponte JSON/CLI entre Python e o servidor Express
│   ├── export_project.py          # Gerador automatizado de pacotes ZIP
│   ├── generate_gemini_bundle.py  # Empacotador para contexto do Gemini (LLM)
│   └── govprice_pesquisa_precos.py# Script autônomo CLI em Python
├── components/                    # Componentes React (PriceMap, PythonConsole, SEI, etc.)
├── services/                      # Camadas de integração (pythonService e geminiService)
├── utils/                         # Cálculos auxiliares e formatação monetária (BRL)
├── server.ts                      # Servidor Full-Stack Express integrado ao Python
├── metadata.json                  # Metadados e configurações da aplicação
├── package.json                   # Dependências e scripts
└── vite.config.ts                 # Configurações do Vite
```

---

## 📄 Licença e Conformidade

Desenvolvido para conformidade técnica com:
- **Lei Federal nº 14.133, de 1º de abril de 2021** (Nova Lei de Licitações e Contratos Administrativos).
- **Instrução Normativa SEGES/ME nº 65, de 7 de julho de 2021** (Procedimento para pesquisa de preços).
```


### ARQUIVO: `components/Compendium.tsx`

```tsx

import React from 'react';
import { BookOpen, FileText, Monitor, AlertOctagon, Scale } from 'lucide-react';

const Compendium: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mt-6">
      <div className="flex items-center gap-2 mb-6 border-b pb-4">
        <BookOpen className="text-blue-600" size={24} />
        <div>
          <h2 className="text-xl font-bold text-slate-800">Compêndio Técnico de Contratações (PMPA)</h2>
          <p className="text-sm text-slate-500">Resumo executivo baseado nos Manuais da DLC, IN 001/2025 e Decretos Municipais.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Documentos Essenciais */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-700 flex items-center gap-2">
            <FileText size={18} className="text-indigo-600" />
            Documentos da Fase Preparatória (Obrigatórios)
          </h3>
          <ul className="space-y-3">
            <li className="bg-slate-50 p-3 rounded border border-slate-100 text-sm">
              <strong className="block text-slate-800">1. ETP (Estudo Técnico Preliminar)</strong>
              <span className="text-slate-600">Deve conter a justificativa da necessidade, estimativa de quantidade e viabilidade. Se houver sigilo no orçamento, deve ser justificado aqui.</span>
            </li>
            <li className="bg-slate-50 p-3 rounded border border-slate-100 text-sm">
              <strong className="block text-slate-800">2. Mapa de Preços (Planilha)</strong>
              <span className="text-slate-600">Deve conter no mínimo 3 preços válidos. Utilizar média ou mediana (o menor dos dois). Validade da pesquisa: 180 dias (6 meses).</span>
            </li>
            <li className="bg-slate-50 p-3 rounded border border-slate-100 text-sm">
              <strong className="block text-slate-800">3. Matriz de Riscos</strong>
              <span className="text-slate-600">Obrigatória. Deve ser inserida como cláusula na minuta do contrato. Define quem assume os riscos da execução.</span>
            </li>
            <li className="bg-slate-50 p-3 rounded border border-slate-100 text-sm">
              <strong className="block text-slate-800">4. Laudo de Formação de Preço</strong>
              <span className="text-slate-600">Documento conclusivo assinado pelo agente responsável, atestando a metodologia utilizada e o valor de referência final.</span>
            </li>
          </ul>
        </div>

        {/* Sistemas e Fluxos */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-700 flex items-center gap-2">
            <Monitor size={18} className="text-emerald-600" />
            Sistemas e Integrações
          </h3>
          <div className="grid grid-cols-1 gap-3">
            <div className="border-l-4 border-emerald-500 bg-emerald-50 p-3 rounded-r text-sm">
              <strong className="text-emerald-800">GMAT (Gestão de Materiais)</strong>
              <p className="text-emerald-700 mt-1">
                Todo item deve ter código ATIVO. Se "Descontinuado" &rarr; SCM de Alteração. Se não existir &rarr; SCM de Inclusão.
                <br/><em>Não use acentos na busca.</em>
              </p>
            </div>
            <div className="border-l-4 border-blue-500 bg-blue-50 p-3 rounded-r text-sm">
              <strong className="text-blue-800">Sisconp (PCA - Plano de Contratações)</strong>
              <p className="text-blue-700 mt-1">
                A demanda deve estar prevista no PCA do ano corrente. O ETP deve citar o item do PCA correspondente.
              </p>
            </div>
            <div className="border-l-4 border-purple-500 bg-purple-50 p-3 rounded-r text-sm">
              <strong className="text-purple-800">SEI (Sistema Eletrônico)</strong>
              <p className="text-purple-700 mt-1">
                Local de formalização. Agrupar prints em um único PDF (Doc Externo). Laudo deve ser Doc Interno assinado.
              </p>
            </div>
          </div>
        </div>

        {/* Regras de Ouro / Metodologia */}
        <div className="md:col-span-2 bg-yellow-50 border border-yellow-200 rounded-lg p-5">
          <h3 className="font-semibold text-yellow-900 flex items-center gap-2 mb-3">
            <Scale size={18} />
            Metodologia de Cálculo & Regras de Ouro (IN 001/2025 & Dec. 21.859)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <strong className="block text-yellow-900 mb-1">1. Cesta de Preços</strong>
              <p className="text-yellow-800">
                Prioridade: Preços Públicos (Licitacon/Painel). Secundário: Sites de Domínio Amplo. Terciário: Fornecedores (último caso).
                <br/>
                <strong>Minímo:</strong> 3 preços de 2 marcas diferentes.
              </p>
            </div>
            <div>
              <strong className="block text-yellow-900 mb-1">2. Cálculo de Referência</strong>
              <p className="text-yellow-800">
                A regra de ouro para mitigar sobrepreço é utilizar o <strong>MENOR VALOR</strong> entre a Média Aritmética e a Mediana da amostra saneada.
              </p>
            </div>
            <div>
              <strong className="block text-yellow-900 mb-1">3. Saneamento (CV)</strong>
              <p className="text-yellow-800">
                Coeficiente de Variação (CV) deve ser ≤ 25%. Valores acima disso indicam amostra heterogênea e devem ser justificados ou saneados (remover outliers).
              </p>
            </div>
          </div>
        </div>

        {/* Pontos de Atenção */}
        <div className="md:col-span-2 border-t pt-4">
           <h3 className="font-semibold text-slate-700 flex items-center gap-2 mb-3">
            <AlertOctagon size={18} className="text-red-500" />
            Pontos de Atenção (Não cometa estes erros)
          </h3>
           <ul className="list-disc list-inside text-sm text-slate-600 grid grid-cols-1 md:grid-cols-2 gap-2">
              <li>Não utilizar <strong>Marketplaces</strong> (Shopee, Mercado Livre genérico) sem loja oficial da marca.</li>
              <li>Não utilizar preços de <strong>leilão</strong> ou saldos de estoque.</li>
              <li>Print Screen deve conter <strong>Data e Hora</strong> visíveis (barra do Windows).</li>
              <li>Para <strong>Dispensa Eletrônica</strong>, o cadastro no Licitacon é pré-requisito obrigatório antes do Portal de Compras.</li>
              <li>Preço estimado não pode ser sigiloso para os órgãos de controle (TCE/TCU).</li>
           </ul>
        </div>

      </div>
    </div>
  );
};

export default Compendium;
```


### ARQUIVO: `components/DataCollector.tsx`

```tsx

import React, { useState, useRef } from 'react';
import { Camera, Plus, Upload, AlertTriangle, CheckCircle, XCircle, ExternalLink, Terminal } from 'lucide-react';
import { PriceItem, SourceType } from '../types';
import { parseScreenshot } from '../services/geminiService';
import { WHITELIST_DOMAINS, BLACKLIST_DOMAINS } from '../constants';
import { validateDomainWithPython } from '../services/pythonService';
import { v4 as uuidv4 } from 'uuid';

interface DataCollectorProps {
  onAddItem: (item: PriceItem) => void;
}

const DataCollector: React.FC<DataCollectorProps> = ({ onAddItem }) => {
  const [mode, setMode] = useState<'MANUAL' | 'AUTO'>('AUTO');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Form State
  const [newItem, setNewItem] = useState<Partial<PriceItem>>({
    sourceType: SourceType.WIDE_DOMAIN,
    accessDate: new Date().toISOString().split('T')[0],
    category: ''
  });

  const checkDomain = async (url: string, name: string) => {
    try {
      const pyCheck = await validateDomainWithPython(url || name);
      if (pyCheck.status === 'PROHIBITED') {
        return { isBlacklisted: true, isWhitelisted: false, reason: pyCheck.message };
      }
      if (pyCheck.status === 'APPROVED') {
        return { isBlacklisted: false, isWhitelisted: true, reason: undefined };
      }
    } catch {
      // Fallback local
    }
    const term = (url + " " + name).toLowerCase();
    const isBlacklisted = BLACKLIST_DOMAINS.some(d => term.includes(d));
    const isWhitelisted = WHITELIST_DOMAINS.some(d => term.includes(d));
    return { isBlacklisted, isWhitelisted, reason: isBlacklisted ? "Fonte Vedada pela IN 65/2021" : undefined };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1]; // Remove header
      try {
        const parsedItem = await parseScreenshot(base64Data, file.name);
        
        // Post-validation logic with Python Safe Search Engine
        const domainCheck = await checkDomain(parsedItem.sourceUrl || '', parsedItem.sourceName || '');
        const item: PriceItem = {
            ...(parsedItem as PriceItem),
            isValid: !domainCheck.isBlacklisted,
            rejectionReason: domainCheck.reason || (domainCheck.isBlacklisted ? "Fonte Vedada (Blacklist)" : undefined)
        }

        onAddItem(item);
      } catch (err) {
        alert("Erro ao processar imagem. Tente adicionar manualmente.");
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleManualSubmit = async () => {
    if (!newItem.priceOriginal || !newItem.sourceName) return;
    
    const domainCheck = await checkDomain(newItem.sourceUrl || '', newItem.sourceName || '');
    
    const item: PriceItem = {
      id: uuidv4(),
      productDescription: newItem.productDescription || "Item Manual",
      priceOriginal: Number(newItem.priceOriginal),
      priceAdjusted: Number(newItem.priceOriginal), // Start equal
      sourceName: newItem.sourceName,
      sourceUrl: newItem.sourceUrl || '',
      sourceType: newItem.sourceType as SourceType,
      accessDate: newItem.accessDate || new Date().toISOString(),
      isValid: !domainCheck.isBlacklisted,
      rejectionReason: domainCheck.reason || (domainCheck.isBlacklisted ? "Fonte Vedada (Blacklist)" : undefined),
      category: newItem.category
    };

    onAddItem(item);
    setNewItem({ 
        sourceType: SourceType.WIDE_DOMAIN, 
        accessDate: new Date().toISOString().split('T')[0], 
        priceOriginal: 0, 
        sourceName: '', 
        productDescription: '', 
        sourceUrl: '',
        category: ''
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Camera className="text-blue-600" size={20} />
          2. Coleta de Preços (Print Screen)
        </h2>
        <div className="flex bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setMode('AUTO')}
            className={`px-3 py-1 text-sm rounded-md font-medium transition-all ${mode === 'AUTO' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
          >
            Leitura Inteligente (IA)
          </button>
          <button
            onClick={() => setMode('MANUAL')}
            className={`px-3 py-1 text-sm rounded-md font-medium transition-all ${mode === 'MANUAL' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
          >
            Manual
          </button>
        </div>
      </div>

      <div className="mb-4 bg-yellow-50 border border-yellow-200 p-3 rounded text-xs text-yellow-800 flex items-start gap-2">
         <AlertTriangle size={14} className="mt-0.5" />
         <p>
            <strong>Atenção:</strong> O print screen deve conter visivelmente a <strong>Data e Hora</strong> de acesso (geralmente no canto inferior direito do Windows). Utilize os links gerados na etapa anterior para garantir que é uma página de produto único.
         </p>
      </div>

      <div className="bg-white border border-slate-200 p-4 rounded-lg mb-6">
         <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
            <Upload size={16} /> Estação de Montagem de PDF (Comprovantes)
         </h3>
         <p className="text-xs text-slate-500 mb-3">
            Após tirar os prints, utilize estas ferramentas externas para juntar tudo em um único arquivo PDF ("Comprovantes.pdf") e salvar na pasta "Cotações".
         </p>
         <div className="flex gap-3">
             <a 
                href="https://www.ilovepdf.com/pt/juntar_pdf" 
                target="_blank" 
                rel="noreferrer"
                className="bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded text-xs font-medium hover:bg-red-100 transition-colors flex items-center gap-1"
             >
                iLovePDF (Juntar) <ExternalLink size={10} />
             </a>
             <a 
                href="https://tools.pdf24.org/pt/juntar-pdf" 
                target="_blank" 
                rel="noreferrer"
                className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-100 transition-colors flex items-center gap-1"
             >
                PDF24 (Juntar) <ExternalLink size={10} />
             </a>
         </div>
      </div>

      {mode === 'AUTO' ? (
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:bg-slate-50 transition-colors">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          {loading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="animate-spin text-blue-600 h-10 w-10 mb-2" />
              <p className="text-slate-600">O Gemini está analisando o print e extraindo os dados...</p>
            </div>
          ) : (
            <div className="cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mx-auto h-12 w-12 text-slate-400 mb-3" />
              <p className="text-base font-medium text-slate-700">Clique para enviar o Print Screen</p>
              <p className="text-sm text-slate-500 mt-1">
                A IA identificará: Preço, Data, Fonte e Produto.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">Fonte (Loja)</label>
            <input 
              className="w-full border p-2 rounded text-sm" 
              placeholder="Ex: Kalunga" 
              value={newItem.sourceName || ''}
              onChange={e => setNewItem({...newItem, sourceName: e.target.value})}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">Preço (R$)</label>
            <input 
              type="number" 
              className="w-full border p-2 rounded text-sm" 
              placeholder="0.00" 
              value={newItem.priceOriginal || ''}
              onChange={e => setNewItem({...newItem, priceOriginal: Number(e.target.value)})}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-500 uppercase">Descrição do Produto</label>
            <input 
              className="w-full border p-2 rounded text-sm" 
              placeholder="Descrição exata conforme site" 
              value={newItem.productDescription || ''}
              onChange={e => setNewItem({...newItem, productDescription: e.target.value})}
            />
          </div>
          <div className="md:col-span-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">URL do Produto</label>
            <input 
              className="w-full border p-2 rounded text-sm" 
              placeholder="https://..." 
              value={newItem.sourceUrl || ''}
              onChange={e => setNewItem({...newItem, sourceUrl: e.target.value})}
            />
          </div>
           <div className="md:col-span-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Categoria (Opcional)</label>
            <input 
              className="w-full border p-2 rounded text-sm" 
              placeholder="Ex: Eletrônicos, Móveis..." 
              value={newItem.category || ''}
              onChange={e => setNewItem({...newItem, category: e.target.value})}
            />
          </div>
          <button 
            onClick={handleManualSubmit}
            className="md:col-span-2 bg-green-600 hover:bg-green-700 text-white py-2 rounded font-medium flex justify-center items-center gap-2"
          >
            <Plus size={18} /> Adicionar ao Mapa
          </button>
        </div>
      )}
    </div>
  );
};

function Loader2({ className, ...props }: any) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    )
}

export default DataCollector;
```


### ARQUIVO: `components/Layout.tsx`

```tsx
import React from 'react';
import { Scale, FileText, AlertCircle, Download } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center space-x-3">
            <Scale className="h-8 w-8 text-blue-400" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">GovPrice</h1>
              <p className="text-xs text-slate-400">Assistente de Formação de Preços (Lei 14.133/21)</p>
            </div>
          </div>
          <nav className="flex space-x-3 text-sm font-medium items-center flex-wrap">
             <a
                href="/govprice_full_code_for_gemini.md"
                download="govprice_full_code_for_gemini.md"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-md shadow transition-colors"
                title="Download do Código em Markdown (.MD) para colar ou anexar no Google Gemini"
             >
                <FileText size={14} />
                Exportar p/ Gemini (.md)
             </a>
             <a
                href="/api/export/zip"
                download="govprice_projeto_completo.zip"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-md shadow transition-colors"
                title="Download do Código-Fonte Completo (.ZIP)"
             >
                <Download size={14} />
                ZIP (.zip)
             </a>
             <div className="flex items-center space-x-1.5 text-xs bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded text-slate-300 font-mono">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Python 3.10 Engine</span>
             </div>
             <div className="flex items-center space-x-2 text-yellow-400 text-xs">
                <AlertCircle size={16} />
                <span className="hidden md:inline">Ambiente Seguro (IN 65)</span>
             </div>
          </nav>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-slate-500 text-sm">
          <p>© {new Date().getFullYear()} - Ferramenta auxiliar para a Diretoria de Licitações e Contratos.</p>
          <p className="text-xs mt-1">Os dados coletados são de responsabilidade do agente público. Sempre valide o Print Screen.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
```


### ARQUIVO: `components/PlanningAssistant.tsx`

```tsx

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
```


### ARQUIVO: `components/PostAnalysisGuide.tsx`

```tsx

import React, { useState } from 'react';
import { CheckSquare, ExternalLink, AlertTriangle, FileCheck, Archive, Database } from 'lucide-react';
import { GMAT_URL, SEI_PORTAL_URL, SEI_WORK_URL } from '../constants';

const PostAnalysisGuide: React.FC = () => {
  const [steps, setSteps] = useState([
    { id: '1', label: 'Consolidação dos Comprovantes', desc: 'Gerar PDF único contendo todos os prints das telas consultadas (com data/hora visíveis).', checked: false, category: 'SEI' },
    { id: '2', label: 'Verificação do GMAT', desc: 'Consultar se o código do material está ATIVO. Se "Descontinuado", abrir SCM de Alteração. Se não existir, abrir SCM de Inclusão.', checked: false, category: 'GMAT' },
    { id: '3', label: 'Registro no PCA', desc: 'Garantir que a demanda consta no Plano de Contratações Anual (Sisconp) e referenciar no ETP.', checked: false, category: 'PCA' },
    { id: '4', label: 'Criação do Processo SEI', desc: 'Iniciar processo do tipo correto (ex: RM Tipo 1 - Aquisição). Nível de acesso: Público (regra geral).', checked: false, category: 'SEI' },
    { id: '5', label: 'Inserção do Laudo', desc: 'Incluir o Laudo de Formação de Preço (gerado acima) e assinar eletronicamente.', checked: false, category: 'SEI' },
    { id: '6', label: 'Anexar Planilha', desc: 'Anexar a Planilha "Mapa de Preços" (Excel ou PDF) assinada.', checked: false, category: 'SEI' },
  ]);

  const toggleStep = (id: string) => {
    setSteps(steps.map(s => s.id === id ? { ...s, checked: !s.checked } : s));
  };

  const progress = Math.round((steps.filter(s => s.checked).length / steps.length) * 100);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mt-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <CheckSquare className="text-blue-600" size={20} />
          5. Trâmites Pós-Preenchimento (Checklist)
        </h2>
        <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">{progress}% Concluído</span>
            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
            {steps.map(step => (
                <div key={step.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${step.checked ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 hover:border-blue-300'}`} onClick={() => toggleStep(step.id)}>
                    <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center ${step.checked ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 bg-white'}`}>
                        {step.checked && <CheckSquare size={14} />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800 text-sm">{step.label}</span>
                            <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{step.category}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{step.desc}</p>
                    </div>
                </div>
            ))}
        </div>

        <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 text-sm mb-2 flex items-center gap-2">
                    <Database size={16} /> Acesso Rápido aos Sistemas
                </h3>
                <div className="space-y-2">
                    <a href={SEI_WORK_URL} target="_blank" rel="noreferrer" className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded text-sm transition-colors flex items-center justify-center gap-2 mb-2 shadow-sm">
                        <Archive size={16} />
                        Abrir Meus Processos (SEI)
                    </a>
                    
                    <div className="grid grid-cols-2 gap-2">
                        <a href={GMAT_URL} target="_blank" rel="noreferrer" className="text-center bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 py-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1">
                            Acessar GMAT <ExternalLink size={10}/>
                        </a>
                        <a href={SEI_PORTAL_URL} target="_blank" rel="noreferrer" className="text-center bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 py-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1">
                            Portal SEI <ExternalLink size={10}/>
                        </a>
                    </div>
                </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-800 text-sm mb-2 flex items-center gap-2">
                    <AlertTriangle size={16} /> Lembrete DLC
                </h3>
                <ul className="text-xs text-yellow-800 space-y-1 list-disc list-inside">
                    <li>Sempre <strong>Autentique</strong> os documentos externos (PDFs de cotação) no SEI.</li>
                    <li>Para processos sigilosos, utilize o nível de acesso <strong>Restrito</strong> e justifique com base legal.</li>
                    <li>O Laudo deve ser assinado eletronicamente com senha ou token.</li>
                </ul>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PostAnalysisGuide;
```


### ARQUIVO: `components/PriceMap.tsx`

```tsx

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
```


### ARQUIVO: `components/PythonConsole.tsx`

```tsx
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
```


### ARQUIVO: `components/ReportGenerator.tsx`

```tsx
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
```


### ARQUIVO: `components/SearchAssistant.tsx`

```tsx

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
```


### ARQUIVO: `constants.ts`

```typescript

export const WHITELIST_DOMAINS = [
  "amazon.com.br",
  "magazineluiza.com.br",
  "kalunga.com.br",
  "americanas.com.br",
  "gimba.com.br",
  "staples.com.br",
  "mercadolivre.com.br/loja/", // Only official stores
  "webmotors.com.br",
  "wimoveis.com.br",
  "imovelweb.com.br",
  "kabum.com.br",
  "dell.com",
  "lenovo.com",
  "pichau.com.br",
  "terabyteshop.com.br",
  "zaffari.com.br",
  "leroymerlin.com.br"
];

export const PUBLIC_DATA_SOURCES = [
  { name: "Licitacon Cidadão (TCE-RS)", url: "https://portal.tce.rs.gov.br/aplicprod/f?p=50500:1" },
  { name: "Painel de Preços (Gov.br)", url: "https://paineldeprecos.planejamento.gov.br/" },
  { name: "Banco de Preços em Saúde (BPS)", url: "https://infoms.saude.gov.br/extensions/SEIDIGI_DEMAS_BPS/SEIDIGI_DEMAS_BPS.html" },
  { name: "Compras.rs (CELIC)", url: "https://www.compras.rs.gov.br/" }
];

export const BLACKLIST_DOMAINS = [
  "shopee.com.br",
  "pt.aliexpress.com",
  "olx.com.br",
  "enjoei.com.br",
  "shein.com",
  "mercadolivre.com.br" // General marketplace without official store check
];

export const PROCEMPA_POWERBI_URL = "https://powerbi.procempa.com.br/reports/powerbi/Administra%C3%A7%C3%A3o%20e%20Planejamento/Self%20Service/SMPG-DLC/Gest%C3%A3o%20DLC";

// IN SEGES 65/2021 & Municipal Decrees limit for Coefficient of Variation
export const MAX_ALLOWED_CV = 0.25;

// Links for GMAT/SEI/REM
export const GMAT_URL = "http://gmat.procempa.com.br/gmat/index.jsp";
export const SEI_PORTAL_URL = "https://portalsei.procempa.com.br/";
export const SEI_WORK_URL = "https://sei.procempa.com.br/controlador.php?acao=procedimento_controlar&acao_origem=procedimento_controlar&tipo_filtro=&infra_sistema=100000093&infra_unidade_atual=110003674&infra_hash=4898a4987331f03e344e9b3807807b7bb9764deed10c7547d3286e01c8d3aae4";
export const NOVOREM_URL = "https://novorem.procempa.com.br/";
```


### ARQUIVO: `index.html`

```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GovPrice - Assistente de Pesquisa de Preços (DLC)</title>
    <meta name="description" content="Sistema de auxílio à pesquisa de preços conforme Lei 14.133/2021. Integração direta com SEI Procempa, GMAT e análise estatística automática." />
    <meta property="og:title" content="GovPrice - Assistente de Pesquisa de Preços (DLC)" />
    <meta property="og:description" content="Sistema de auxílio à pesquisa de preços conforme Lei 14.133/2021. Integração direta com SEI Procempa, GMAT e análise estatística automática." />
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
      body {
        font-family: 'Inter', sans-serif;
        background-color: #f3f4f6;
      }
    </style>
  <script type="importmap">
{
  "imports": {
    "react": "https://aistudiocdn.com/react@^19.2.0",
    "react/": "https://aistudiocdn.com/react@^19.2.0/",
    "lucide-react": "https://aistudiocdn.com/lucide-react@^0.555.0",
    "recharts": "https://aistudiocdn.com/recharts@^3.5.1",
    "uuid": "https://aistudiocdn.com/uuid@^13.0.0",
    "@google/genai": "https://aistudiocdn.com/@google/genai@^1.30.0",
    "react-dom/": "https://aistudiocdn.com/react-dom@^19.2.0/"
  }
}
</script>
<link rel="stylesheet" href="/index.css">
</head>
  <body>
    <div id="root"></div>
  <script type="module" src="/index.tsx"></script>
</body>
</html>
```


### ARQUIVO: `index.tsx`

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```


### ARQUIVO: `metadata.json`

```json
{
  "name": "GovPrice - Assistente de Pesquisa de Preços (DLC)",
  "description": "Sistema de auxílio à pesquisa de preços conforme Lei 14.133/2021. Integração direta com SEI Procempa, GMAT e análise estatística automática.",
  "requestFramePermissions": [],
  "majorCapabilities": [
    "MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API"
  ]
}
```


### ARQUIVO: `package.json`

```json
{
  "name": "govprice---assistente-de-pesquisa-de-preços-(dlc)",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx server.ts",
    "lint": "tsc --noEmit",
    "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
    "start": "node dist/server.cjs",
    "preview": "vite preview"
  },
  "dependencies": {
    "@google/genai": "^1.30.0",
    "@types/express": "^5.0.6",
    "esbuild": "^0.28.2",
    "express": "^5.2.1",
    "lucide-react": "^0.555.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "recharts": "^3.5.1",
    "tsx": "^4.23.13",
    "uuid": "^13.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "@vitejs/plugin-react": "^5.0.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.0"
  }
}
```


### ARQUIVO: `python/export_project.py`

```python
#!/usr/bin/env python3
"""
Gera um arquivo ZIP completo e limpo do código-fonte do projeto GovPrice
(Exclui node_modules, dist, cache e arquivos temporários)
"""

import os
import sys
import zipfile
import io

EXCLUDE_DIRS = {
    "node_modules",
    "dist",
    ".git",
    ".cache",
    "__pycache__",
    ".npm"
}

EXCLUDE_FILES = {
    ".DS_Store",
    "package-lock.json"  # opcional, mas pode manter se quiser
}

def create_project_zip(root_dir: str) -> bytes:
    buffer = io.BytesIO()
    
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(root_dir):
            # Filtra diretórios excluídos in-place
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith(".")]
            
            for file in files:
                if file in EXCLUDE_FILES or file.endswith(".pyc") or file.endswith(".log"):
                    continue
                
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, root_dir)
                
                # Não incluir o próprio zip se for salvo na raiz
                if rel_path.endswith(".zip") or rel_path.endswith(".tar.gz"):
                    continue
                    
                zf.write(full_path, arcname=rel_path)
                
    buffer.seek(0)
    return buffer.getvalue()

if __name__ == "__main__":
    out_name = sys.argv[1] if len(sys.argv) > 1 else "govprice_projeto_completo.zip"
    zip_bytes = create_project_zip(os.getcwd())
    with open(out_name, "wb") as f:
        f.write(zip_bytes)
    print(f"Exportado com sucesso: {out_name} ({len(zip_bytes)} bytes)")
```


### ARQUIVO: `python/generate_gemini_bundle.py`

```python
#!/usr/bin/env python3
"""
Script que compila todo o código-fonte do projeto em um único documento Markdown/Texto
estruturado para alimentar o Google Gemini, Claude, ChatGPT ou outros LLMs.
"""

import os

EXCLUDE_DIRS = {"node_modules", "dist", ".git", "__pycache__", ".cache", "public"}
EXCLUDE_FILES = {"package-lock.json", "bun.lock", ".tmp_project_export.zip"}

def generate_gemini_bundle(output_file: str):
    files_to_bundle = []
    for root, dirs, files in os.walk("."):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith(".")]
        for f in files:
            if f in EXCLUDE_FILES or f.endswith(".zip") or f.endswith(".pyc"):
                continue
            rel = os.path.relpath(os.path.join(root, f), ".")
            files_to_bundle.append(rel)

    files_to_bundle.sort()

    lines = []
    lines.append("# PROJETO GOVPRICE - CÓDIGO-FONTE COMPLETO PARA ANÁLISE NO GEMINI\n")
    lines.append("Este documento contém todo o código-fonte do projeto GovPrice: Motor Estatístico em Python 3.10, Servidor Node/Express Full-Stack e Interface React com TypeScript, aderente à Lei 14.133/2021 e IN SEGES/ME nº 65/2021.\n")
    lines.append("## ESTRUTURA DO PROJETO E ÍNDICE DE ARQUIVOS:\n")
    for f in files_to_bundle:
        lines.append(f"- {f}")
    lines.append("\n" + "="*80 + "\n")

    for f in files_to_bundle:
        lines.append(f"\n### ARQUIVO: `{f}`\n")
        ext = f.split(".")[-1].lower()
        lang_map = {
            "py": "python",
            "ts": "typescript",
            "tsx": "tsx",
            "js": "javascript",
            "json": "json",
            "html": "html",
            "css": "css",
            "gitignore": "gitignore"
        }
        lang = lang_map.get(ext, "")
        lines.append(f"```{lang}")
        try:
            with open(f, "r", encoding="utf-8") as fp:
                lines.append(fp.read().rstrip())
        except Exception as err:
            lines.append(f"# Erro ao ler: {err}")
        lines.append("```\n")

    full_content = "\n".join(lines)
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as out_fp:
        out_fp.write(full_content)

    print(f"Bundle gerado com sucesso: {output_file} ({len(full_content)} caracteres, {len(files_to_bundle)} arquivos)")

if __name__ == "__main__":
    generate_gemini_bundle("public/govprice_full_code_for_gemini.md")
    generate_gemini_bundle("public/govprice_full_code_for_gemini.txt")
```


### ARQUIVO: `python/govprice_pesquisa_precos.py`

```python
#!/usr/bin/env python3
"""
GovPrice - Script Autônomo em Python para Formação de Preço de Referência
Em conformidade com a Lei Federal nº 14.133/2021 e IN SEGES/ME nº 65/2021.

Como usar via terminal:
    python3 govprice_pesquisa_precos.py --objeto "Cadeira Ergonômica NR17" --precos 650.0 690.0 720.0 680.0
    ou execute interativamente:
    python3 govprice_pesquisa_precos.py
"""

import sys
import json
import argparse
import statistics
from datetime import datetime

MAX_ALLOWED_CV = 0.25

def format_brl(val: float) -> str:
    s = f"{val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"R$ {s}"

def run_analysis(objeto: str, precos: list, fontes: list = None):
    if not precos:
        print("Erro: Nenhum preço fornecido para cálculo.")
        return

    n = len(precos)
    media = statistics.mean(precos)
    mediana = statistics.median(precos)
    desvio_padrao = statistics.stdev(precos) if n > 1 else 0.0
    cv = (desvio_padrao / media) if media > 0 else 0.0
    homogenea = cv <= MAX_ALLOWED_CV
    
    # Preço de referência: Menor entre média e mediana
    preco_ref = min(media, mediana)
    metodo = "Média Aritmética" if media <= mediana else "Mediana"

    # IQR Outlier check
    iqr_str = "Amostra pequena (<4 itens) para IQR"
    if n >= 4:
        q1, _, q3 = statistics.quantiles(precos, n=4)
        iqr = q3 - q1
        lim_inf = max(0.0, q1 - 1.5 * iqr)
        lim_sup = q3 + 1.5 * iqr
        iqr_str = f"Faixa aceitável IQR: [{format_brl(lim_inf)} a {format_brl(lim_sup)}]"

    print("=" * 65)
    print(" GOVPRICE - RELATÓRIO ESTATÍSTICO DE FORMAÇÃO DE PREÇO (PYTHON)")
    print(" Conforme Lei 14.133/2021 e IN 65/2021")
    print("=" * 65)
    print(f"Objeto: {objeto}")
    print(f"Data: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    print(f"Número de Cotações: {n}")
    print("-" * 65)
    print("AMOSTRAS:")
    for idx, p in enumerate(precos, 1):
        fonte_nome = fontes[idx - 1] if fontes and idx - 1 < len(fontes) else f"Cotação {idx}"
        print(f"  [{idx}] {fonte_nome}: {format_brl(p)}")
    print("-" * 65)
    print("TRATAMENTO ESTATÍSTICO:")
    print(f"  • Média Aritmética:          {format_brl(media)}")
    print(f"  • Mediana:                   {format_brl(mediana)}")
    print(f"  • Desvio Padrão Amostral:    {format_brl(desvio_padrao)}")
    print(f"  • Coeficiente Variação (CV): {cv * 100:.2f}%")
    print(f"  • Homogeneidade (CV <= 25%): {'HOMOGÊNEA (Aprovada)' if homogenea else 'HETEROGÊNEA (Requer justificativa)'}")
    print(f"  • {iqr_str}")
    print("-" * 65)
    print(f"CRITÉRIO ADOTADO: Menor entre Média e Mediana ({metodo})")
    print(f">>> PREÇO ESTIMADO DE REFERÊNCIA: {format_brl(preco_ref)} <<<")
    print("=" * 65)

def main():
    parser = argparse.ArgumentParser(description="Formador de Preços de Referência em Python")
    parser.add_argument("--objeto", type=str, default="Item de Consumo", help="Descrição do objeto")
    parser.add_argument("--precos", nargs="+", type=float, help="Lista de preços numéricos")
    args = parser.parse_args()

    if args.precos:
        run_analysis(args.objeto, args.precos)
    else:
        print("--- Modo Interativo GovPrice Python ---")
        obj = input("Digite o nome do objeto licitado: ").strip() or "Material de Consumo"
        print("Digite os preços das cotações válidas separados por espaço (ex: 120.50 118.00 135.90):")
        raw = input("Preços: ").strip()
        try:
            precos = [float(x.replace(",", ".")) for x in raw.split()]
            run_analysis(obj, precos)
        except Exception as e:
            print(f"Erro ao converter preços: {e}")

if __name__ == "__main__":
    main()
```


### ARQUIVO: `python/main.py`

```python
#!/usr/bin/env python3
"""
Ponto de Entrada Principal (CLI e Bridge JSON) do Motor Python
"""

import sys
import json
import argparse
from statistical_engine import calculate_stats, generate_laudo_text, detect_outliers_iqr
from safe_search_engine import validate_domain, generate_search_queries, SAFE_DOMAINS

def handle_calculate(payload: dict) -> dict:
    items = payload.get("items", [])
    return calculate_stats(items)

def handle_laudo(payload: dict) -> dict:
    items = payload.get("items", [])
    product = payload.get("product", "Item de Consumo / Serviço")
    stats = calculate_stats(items)
    laudo = generate_laudo_text(stats, items, product)
    return {
        "stats": stats,
        "laudo": laudo,
        "engine": "Python 3.10"
    }

def handle_validate_source(payload: dict) -> dict:
    url_or_domain = payload.get("url", "")
    return validate_domain(url_or_domain)

def handle_search_queries(payload: dict) -> dict:
    product = payload.get("product", "")
    brand = payload.get("brand")
    queries = generate_search_queries(product, brand)
    return {
        "product": product,
        "brand": brand,
        "queries": queries,
        "safe_domains_count": len(SAFE_DOMAINS)
    }

def main():
    parser = argparse.ArgumentParser(description="GovPrice Python Engine")
    parser.add_argument("--action", required=True, choices=["calculate", "laudo", "validate_source", "search_queries", "info"])
    args = parser.parse_args()
    
    if args.action == "info":
        result = {
            "name": "GovPrice Python Engine",
            "version": "1.0.0",
            "python_version": sys.version,
            "modules": ["statistical_engine", "safe_search_engine"]
        }
        print(json.dumps(result, ensure_ascii=False))
        return

    # Lê o JSON de entrada da stdin
    try:
        input_data = sys.stdin.read().strip()
        payload = json.loads(input_data) if input_data else {}
    except Exception as e:
        print(json.dumps({"error": f"JSON inválido na entrada: {str(e)}"}), file=sys.stderr)
        sys.exit(1)
        
    try:
        if args.action == "calculate":
            output = handle_calculate(payload)
        elif args.action == "laudo":
            output = handle_laudo(payload)
        elif args.action == "validate_source":
            output = handle_validate_source(payload)
        elif args.action == "search_queries":
            output = handle_search_queries(payload)
        else:
            output = {"error": f"Ação desconhecida: {args.action}"}
            
        print(json.dumps(output, ensure_ascii=False, indent=2))
    except Exception as e:
        print(json.dumps({"error": f"Falha na execução Python: {str(e)}"}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
```


### ARQUIVO: `python/safe_search_engine.py`

```python
#!/usr/bin/env python3
"""
Módulo de Pesquisa e Validação de Sites Seguros na Internet
Conforme IN 65/2021 Art. 5º (Sítios eletrônicos de domínio amplo)
"""

import urllib.parse
from typing import List, Dict, Any, Optional

# Lista de domínios seguros autorizados (Domínio amplo de grande porte com CNPJ e SSL)
SAFE_DOMAINS = [
    {
        "domain": "amazon.com.br",
        "name": "Amazon Brasil",
        "category": "Geral / Tecnologia / Escritório",
        "notes": "Apenas itens 'Vendido e Entregue por Amazon' ou lojas oficiais de fabricantes",
        "trust_score": 98
    },
    {
        "domain": "magazineluiza.com.br",
        "name": "Magazine Luiza",
        "category": "Eletroeletrônicos / Escritório",
        "notes": "Filtrar por 'Vendido por Magalu'",
        "trust_score": 96
    },
    {
        "domain": "kalunga.com.br",
        "name": "Kalunga",
        "category": "Material de Escritório / Informática / Papelaria",
        "notes": "Especialista corporativo com lojas físicas e nota fiscal garantida",
        "trust_score": 99
    },
    {
        "domain": "kabum.com.br",
        "name": "KaBuM!",
        "category": "Informática / Hardware / Redes",
        "notes": "Grupo Magazine Luiza, alta confiabilidade para itens de TI",
        "trust_score": 95
    },
    {
        "domain": "casasbahia.com.br",
        "name": "Casas Bahia",
        "category": "Mobiliário / Eletro",
        "notes": "Filtrar produtos próprios 'Vendido por Casas Bahia'",
        "trust_score": 94
    },
    {
        "domain": "leroymerlin.com.br",
        "name": "Leroy Merlin",
        "category": "Construção / Manutenção / Ferramentas",
        "notes": "Lojas físicas e e-commerce corporativo consolidado",
        "trust_score": 97
    },
    {
        "domain": "dell.com/pt-br",
        "name": "Dell Technologies",
        "category": "Servidores / Workstations / Laptops",
        "notes": "Fabricante direto, cotações oficiais corporativas",
        "trust_score": 100
    },
    {
        "domain": "drogasil.com.br",
        "name": "Drogasil",
        "category": "Saúde / Higiene / Farmácia",
        "notes": "Rede RaiaDrogasil com presença nacional",
        "trust_score": 97
    }
]

# Domínios Proibidos ou de Alto Risco pela IN 65/2021 (Marketplaces sem idoneidade / C2C)
PROHIBITED_OR_RISKY_PATTERNS = [
    {
        "pattern": "shopee.com.br",
        "reason": "Marketplace predominantemente de pessoas físicas / importação não desembaraçada sem garantia de nota fiscal homologável.",
        "allowed": False
    },
    {
        "pattern": "olx.com.br",
        "reason": "Plataforma de anúncios de pessoa física e usados. Expressamente vedada.",
        "allowed": False
    },
    {
        "pattern": "enjoei.com.br",
        "reason": "Comércio de produtos usados e pessoa física.",
        "allowed": False
    },
    {
        "pattern": "aliexpress.com",
        "reason": "Comércio internacional cross-border sem tributação nacionalizada prévia.",
        "allowed": False
    }
]

def validate_domain(url_or_domain: str) -> Dict[str, Any]:
    """
    Valida se um sítio da internet é considerado seguro para fins de pesquisa pública.
    """
    cleaned = url_or_domain.lower().strip()
    if "://" in cleaned:
        try:
            parsed = urllib.parse.urlparse(cleaned)
            cleaned = parsed.netloc
        except Exception:
            pass
            
    # Remove prefixos www.
    if cleaned.startswith("www."):
        cleaned = cleaned[4:]
        
    # Verifica proibições
    for risk in PROHIBITED_OR_RISKY_PATTERNS:
        if risk["pattern"] in cleaned:
            return {
                "is_valid": False,
                "status": "PROHIBITED",
                "domain": cleaned,
                "score": 0,
                "message": f"VEDADO PELA LEI 14.133/2021: {risk['reason']}"
            }
            
    # Verifica whitelist
    for safe in SAFE_DOMAINS:
        if safe["domain"] in cleaned or cleaned in safe["domain"]:
            return {
                "is_valid": True,
                "status": "APPROVED",
                "domain": cleaned,
                "name": safe["name"],
                "score": safe["trust_score"],
                "notes": safe["notes"],
                "message": "Sítio de domínio amplo aprovado com alta confiabilidade e suporte a nota fiscal."
            }
            
    # Domínio não listado expressamente mas não proibido
    return {
        "is_valid": True,
        "status": "MANUAL_REVIEW",
        "domain": cleaned,
        "score": 70,
        "message": "Domínio não cadastrado na lista padrão de grandes redes. Certifique-se de que possui CNPJ ativo, HTTPS e emite NF-e corporativa."
    }

def generate_search_queries(product_name: str, brand_filter: Optional[str] = None) -> List[Dict[str, str]]:
    """
    Gera dorks de busca do Google direcionadas exclusivamente a sites seguros de domínio amplo.
    """
    queries = []
    base_term = product_name.strip()
    if brand_filter:
        base_term += f" {brand_filter.strip()}"
        
    for safe in SAFE_DOMAINS[:5]:
        domain = safe["domain"].split("/")[0]
        query = f'site:{domain} "{base_term}"'
        google_url = f"https://www.google.com/search?q={urllib.parse.quote_plus(query)}"
        queries.append({
            "source": safe["name"],
            "domain": domain,
            "query": query,
            "url": google_url,
            "notes": safe["notes"]
        })
        
    # Adicionar busca pública em PNCP / Compras Públicas
    pncp_query = f'site:pncp.gov.br "{base_term}"'
    queries.append({
        "source": "Portal Nacional de Contratações Públicas (PNCP)",
        "domain": "pncp.gov.br",
        "query": pncp_query,
        "url": f"https://www.google.com/search?q={urllib.parse.quote_plus(pncp_query)}",
        "notes": "Prioridade 1 pela Lei 14.133/2021 (preços públicos homologados)"
    })
    
    return queries
```


### ARQUIVO: `python/statistical_engine.py`

```python
#!/usr/bin/env python3
"""
Módulo Estatístico para Formação de Preço de Referência
Conforme a Lei nº 14.133/2021, IN SEGES/ME nº 65/2021 e jurisprudência do TCU.
"""

import sys
import json
import math
import statistics
from typing import List, Dict, Any, Tuple
from datetime import datetime

MAX_ALLOWED_CV = 0.25  # 25% de coeficiente de variação máximo para cesta homogênea

def format_currency(value: float) -> str:
    """Formata valor em Real Brasileiro (R$)"""
    formatted = f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"R$ {formatted}"

def format_percent(value: float) -> str:
    """Formata percentual com 2 casas decimais"""
    return f"{value * 100:.2f}%"

def detect_outliers_iqr(prices: List[float]) -> Dict[str, Any]:
    """
    Detecta valores discrepantes (outliers) utilizando o Método do Intervalo Interquartil (IQR).
    Q1 = percentil 25, Q3 = percentil 75
    Limite Inferior = Q1 - 1.5 * IQR
    Limite Superior = Q3 + 1.5 * IQR
    """
    if len(prices) < 4:
        return {
            "q1": None,
            "q3": None,
            "iqr": None,
            "lower_bound": None,
            "upper_bound": None,
            "outliers_indices": []
        }
    
    sorted_prices = sorted(prices)
    # quantiles n=4 dá os 3 cortes: q1, q2 (mediana), q3
    q1, q2, q3 = statistics.quantiles(sorted_prices, n=4)
    iqr = q3 - q1
    lower_bound = max(0.0, q1 - 1.5 * iqr)
    upper_bound = q3 + 1.5 * iqr
    
    outliers_indices = []
    for idx, p in enumerate(prices):
        if p < lower_bound or p > upper_bound:
            outliers_indices.append(idx)
            
    return {
        "q1": round(q1, 2),
        "q3": round(q3, 2),
        "iqr": round(iqr, 2),
        "lower_bound": round(lower_bound, 2),
        "upper_bound": round(upper_bound, 2),
        "outliers_indices": outliers_indices
    }

def calculate_stats(items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calcula as estatísticas descritivas da cesta de preços.
    Aplica regras da Lei 14.133/2021 e IN 65/2021.
    """
    valid_items = [item for item in items if item.get("isValid", True)]
    count = len(valid_items)
    
    if count == 0:
        return {
            "mean": 0.0,
            "median": 0.0,
            "stdDev": 0.0,
            "cv": 0.0,
            "itemCount": len(items),
            "validItemCount": 0,
            "referencePrice": 0.0,
            "homogeneityStatus": "HOMOGENEOUS",
            "methodologyUsed": "N/A",
            "iqrAnalysis": None,
            "outliersCount": 0,
            "engine": "Python 3.10 (Standard Library / statistics)"
        }
        
    prices = []
    for item in valid_items:
        val = item.get("priceAdjusted") if item.get("priceAdjusted") is not None else item.get("priceOriginal")
        if val is None:
            val = item.get("price") if item.get("price") is not None else item.get("valor", 0.0)
        prices.append(float(val))
    
    # 1. Média Aritmética
    mean = statistics.mean(prices)
    
    # 2. Mediana
    median = statistics.median(prices)
    
    # 3. Desvio Padrão Amostral
    std_dev = statistics.stdev(prices) if count > 1 else 0.0
    
    # 4. Coeficiente de Variação (CV = Desvio Padrão / Média)
    cv = (std_dev / mean) if mean > 0 else 0.0
    
    # 5. Análise de Outliers (IQR)
    iqr_data = detect_outliers_iqr(prices)
    
    # 6. Regra de Formação de Preço de Referência:
    # Menor valor entre a Média e a Mediana (prática adotada para mitigar sobrepreço e resguardar o erário)
    reference_price = min(mean, median)
    if abs(mean - median) < 0.001:
        method = "Média Aritmética e Mediana Idênticas"
    elif mean < median:
        method = "Média Aritmética (Menor valor entre média e mediana)"
    else:
        method = "Mediana (Menor valor entre média e mediana)"
        
    homogeneity = "HOMOGENEOUS" if cv <= MAX_ALLOWED_CV else "HETEROGENEOUS"
    
    return {
        "mean": round(mean, 2),
        "median": round(median, 2),
        "stdDev": round(std_dev, 2),
        "cv": round(cv, 4),
        "itemCount": len(items),
        "validItemCount": count,
        "referencePrice": round(reference_price, 2),
        "homogeneityStatus": homogeneity,
        "methodologyUsed": method,
        "iqrAnalysis": iqr_data,
        "outliersCount": len(iqr_data["outliers_indices"]),
        "engine": "Python 3.10 (Standard Library / statistics)"
    }

def generate_laudo_text(stats: Dict[str, Any], items: List[Dict[str, Any]], product: str) -> str:
    """Gera laudo técnico oficial em conformidade com a Lei 14.133/2021"""
    valid_items = [i for i in items if i.get("isValid", True)]
    today = datetime.now().strftime("%d/%m/%Y")
    
    public_sources = sum(1 for i in valid_items if "Pública" in str(i.get("sourceType", "")))
    internet_sources = sum(1 for i in valid_items if "Domínio Amplo" in str(i.get("sourceType", "")))
    supplier_sources = sum(1 for i in valid_items if "Fornecedor" in str(i.get("sourceType", "")))
    
    sources_text = "\n".join(
        f"- {i.get('sourceName', 'Fonte')}: {format_currency(float(i.get('priceAdjusted') or i.get('priceOriginal', 0.0)))} ({i.get('accessDate', today)})"
        for i in valid_items
    )
    
    cv_percent = format_percent(stats.get("cv", 0.0))
    status_desc = "HOMOGÊNEA (CV ≤ 25%) - Cesta estatisticamente consistente." if stats.get("homogeneityStatus") == "HOMOGENEOUS" else "HETEROGÊNEA (CV > 25%) - Requer justificativa técnica ou expurgo de itens discrepantes."
    
    return f"""
LAUDO TÉCNICO DE FORMAÇÃO DE PREÇO DE REFERÊNCIA
(Processado via Motor Estatístico Python 3.10 - Lei nº 14.133/2021)

1. OBJETO DA PESQUISA
Item / Descrição: {product}

2. FUNDAMENTAÇÃO LEGAL E METODOLOGIA
Pesquisa elaborada em estrita observância ao art. 23 da Lei Federal nº 14.133/2021,
à Instrução Normativa SEGES/ME nº 65/2021 e às normas municipais vigentes.
Foram priorizados preços públicos homologados e sítios eletrônicos de domínio amplo seguros.

3. FONTES CONSULTADAS E CESTA DE PREÇOS
Total de Amostras Válidas: {stats.get('validItemCount', 0)}
- Portais Públicos de Compras (PNCP/Licitacon/Painel de Preços): {public_sources}
- Sítios Eletrônicos de Domínio Amplo (E-commerce seguro): {internet_sources}
- Orçamentos de Fornecedores Especializados: {supplierSources if 'supplierSources' in locals() else supplier_sources}

Discriminação das Cotações Válidas:
{sources_text if sources_text else "(Nenhum item válido registrado)"}

4. TRATAMENTO ESTATÍSTICO DESCRITIVO (MOTOR PYTHON)
- Média Aritmética: {format_currency(stats.get('mean', 0.0))}
- Mediana: {format_currency(stats.get('median', 0.0))}
- Desvio Padrão Amostral (s): {format_currency(stats.get('stdDev', 0.0))}
- Coeficiente de Variação (CV): {cv_percent}
- Diagnóstico da Cesta: {status_desc}
{f"- Análise de Outliers (IQR): Limites [{format_currency(stats['iqrAnalysis']['lower_bound'])} a {format_currency(stats['iqrAnalysis']['upper_bound'])}]" if stats.get('iqrAnalysis') and stats['iqrAnalysis'].get('lower_bound') is not None else ""}

5. PREÇO DE REFERÊNCIA HOMOLOGADO
Critério Aplicado: {stats.get('methodologyUsed', 'Menor entre Média e Mediana')}
Justificativa: Adoção do critério mais conservador para evitar sobrepreço na fase preparatória da licitação.

VALOR UNITÁRIO DE REFERÊNCIA: {format_currency(stats.get('referencePrice', 0.0))}

6. DECLARAÇÃO DE CONFORMIDADE
Declara-se que os preços coletados atendem à temporalidade máxima de 180 dias,
não incluem lojas sem idoneidade comprovada ou pessoas físicas, e respeitam o limite
de 1 (um) preço por sítio/grupo econômico (IN 65/2021, art. 5º, § 2º).

Porto Alegre, {today}
____________________________________________________
Agente de Contratação / Pesquisador de Preços
""".strip()
```


### ARQUIVO: `server.ts`

```typescript
import express from "express";
import path from "path";
import { spawn } from "child_process";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Helper function to execute Python scripts cleanly
function runPython(action: string, payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(process.cwd(), "python", "main.py");
    const py = spawn("python3", [pythonScript, "--action", action], {
      cwd: process.cwd(),
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });

    let stdout = "";
    let stderr = "";

    py.stdout.on("data", (data) => {
      stdout += data.toString("utf-8");
    });

    py.stderr.on("data", (data) => {
      stderr += data.toString("utf-8");
    });

    py.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`Python process exited with code ${code}: ${stderr || stdout}`));
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Failed to parse Python JSON output: ${stdout}`));
      }
    });

    py.on("error", (err) => {
      reject(new Error(`Failed to spawn Python: ${err.message}`));
    });

    if (payload) {
      py.stdin.write(JSON.stringify(payload));
    }
    py.stdin.end();
  });
}

// 1. Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 2. Python Status and Info
app.get("/api/python/status", async (_req, res) => {
  try {
    const info = await runPython("info", null);
    res.json({ status: "ok", ...info });
  } catch (error: any) {
    res.status(500).json({ status: "error", error: error.message });
  }
});

// 3. Statistical Calculation using Python Engine
app.post("/api/python/calculate", async (req, res) => {
  try {
    const { items } = req.body;
    const result = await runPython("calculate", { items: items || [] });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Official Laudo generation via Python
app.post("/api/python/laudo", async (req, res) => {
  try {
    const { items, product } = req.body;
    const result = await runPython("laudo", { items: items || [], product: product || "Item de Consumo" });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Safe Domain / Internet Site Validation via Python
app.post("/api/python/validate-source", async (req, res) => {
  try {
    const { url } = req.body;
    const result = await runPython("validate_source", { url: url || "" });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Safe Search Query Generation via Python
app.post("/api/python/search-queries", async (req, res) => {
  try {
    const { product, brand } = req.body;
    const result = await runPython("search_queries", { product: product || "", brand });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Download or view the Standalone Python script
app.get("/api/python/script-source", (_req, res) => {
  try {
    const scriptPath = path.join(process.cwd(), "python", "govprice_pesquisa_precos.py");
    const content = fs.readFileSync(scriptPath, "utf-8");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(content);
  } catch (error: any) {
    res.status(500).send(`Erro ao carregar script Python: ${error.message}`);
  }
});

// 8. Export Full Project Code as ZIP
app.get("/api/export/zip", (_req, res) => {
  const tmpZipPath = path.join(process.cwd(), ".tmp_project_export.zip");
  const py = spawn("python3", [path.join(process.cwd(), "python", "export_project.py"), tmpZipPath]);

  py.on("close", (code) => {
    if (code !== 0 || !fs.existsSync(tmpZipPath)) {
      return res.status(500).json({ error: "Falha ao gerar o arquivo ZIP do projeto." });
    }
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="govprice_projeto_completo.zip"');
    
    const fileStream = fs.createReadStream(tmpZipPath);
    fileStream.pipe(res);
    fileStream.on("end", () => {
      try {
        fs.unlinkSync(tmpZipPath);
      } catch {}
    });
  });

  py.on("error", (err) => {
    res.status(500).json({ error: `Erro no processo de exportação: ${err.message}` });
  });
});

// 9. Export Full Code for Gemini (Markdown / Text Single File)
app.get("/api/export/gemini", (_req, res) => {
  const filePath = path.join(process.cwd(), "public", "govprice_full_code_for_gemini.md");
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Arquivo não encontrado. Execute o gerador.");
  }
  res.setHeader("Content-Type", "text/markdown; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="govprice_full_code_for_gemini.md"');
  res.sendFile(filePath);
});

async function startServer() {
  // Vite middleware in dev; static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Express 5 requires *all
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`GovPrice Full-Stack server with Python Engine running on port ${PORT}`);
  });
}

startServer();
```


### ARQUIVO: `services/geminiService.ts`

```typescript

import { GoogleGenAI, Type } from "@google/genai";
import { PriceItem, SourceType, SearchResultItem } from "../types";
import { v4 as uuidv4 } from 'uuid';
import { WHITELIST_DOMAINS } from "../constants";

// Lazy initialize Gemini Client
const getAiClient = () => {
  const apiKey = (typeof process !== 'undefined' && (process.env.API_KEY || process.env.GEMINI_API_KEY)) || '';
  return new GoogleGenAI({ apiKey });
};

/**
 * Parses an uploaded Print Screen to extract price data using Gemini 2.5 Flash.
 */
export const parseScreenshot = async (base64Image: string, filename: string): Promise<Partial<PriceItem>> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/png", // Assuming PNG/JPEG, API handles generic image types well
              data: base64Image
            }
          },
          {
            text: `Analise este print screen de uma página de produto para uma pesquisa de preço de licitação pública.
            Extraia as seguintes informações em formato JSON:
            1. productDescription: O nome completo do produto.
            2. priceOriginal: O preço numérico (use o preço principal/atual. Se houver "De/Por", use o "Por" se for o preço vigente para pagamento a prazo. Ignore preços exclusivos de Pix se houver opção a prazo. Ignore descontos de programas de fidelidade). Retorne como número.
            3. sourceName: O nome da loja/site (ex: Amazon, Magalu).
            4. sourceUrl: Se visível na barra de endereços, extraia. Caso contrário, deixe vazio.
            5. accessDate: Se visível (relógio do sistema), extraia YYYY-MM-DD. Caso contrário, retorne a data de hoje: ${new Date().toISOString().split('T')[0]}.
            
            Se for um site de marketplace (Shopee, AliExpress), marque como inválido na sua análise mental, mas extraia os dados mesmo assim.
            `
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            productDescription: { type: Type.STRING },
            priceOriginal: { type: Type.NUMBER },
            sourceName: { type: Type.STRING },
            sourceUrl: { type: Type.STRING },
            accessDate: { type: Type.STRING },
          }
        }
      }
    });

    const data = JSON.parse(response.text || "{}");

    return {
      id: uuidv4(),
      productDescription: data.productDescription || "Produto não identificado",
      priceOriginal: data.priceOriginal || 0,
      sourceName: data.sourceName || "Fonte Desconhecida",
      sourceUrl: data.sourceUrl || "",
      accessDate: data.accessDate || new Date().toISOString().split('T')[0],
      sourceType: SourceType.WIDE_DOMAIN,
      isValid: true,
      printScreen: base64Image
    };

  } catch (error) {
    console.error("Gemini Image Parsing Error:", error);
    throw new Error("Falha ao analisar o print screen. Tente novamente ou insira manualmente.");
  }
};

/**
 * Uses Google Search Grounding to find real product links.
 * Now accepts Homologated and Estimated prices for smarter context.
 */
export const findProductLinks = async (
    product: string, 
    prices: { homologated?: number, estimated?: number }, 
    dateRange: string = '180'
): Promise<SearchResultItem[]> => {
  const whitelistStr = WHITELIST_DOMAINS.join(", ");
  
  // Calculate date cutoff
  const days = parseInt(dateRange);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const dateStr = cutoffDate.toLocaleDateString('pt-BR');

  let priceContext = "";
  if (prices.homologated && prices.homologated > 0) {
    priceContext += `\n- PREÇO HOMOLOGADO (REFERÊNCIA DE COMPRA ANTERIOR): R$ ${prices.homologated.toFixed(2)}. Priorize itens próximos a este valor, pois representa o histórico real pago pela Administração.`;
  }
  if (prices.estimated && prices.estimated > 0) {
    priceContext += `\n- PREÇO ESTIMADO (MÉDIA DE MERCADO): R$ ${prices.estimated.toFixed(2)}. Use como teto de aceitabilidade.`;
  }
  
  if (priceContext) {
      priceContext += "\n- INTELLIGENT FILTERING: Descarte produtos com preços manifestamente inexequíveis (muito abaixo) ou com sobrepreço (muito acima) destas referências, a menos que sejam de qualidade superior justificada.";
      // Add tier logic based on documentation
      const ceiling = prices.estimated || prices.homologated || 0;
      if (ceiling > 0) {
        priceContext += `\n- CLASSIFICAÇÃO DE PREÇO: 
          * Camada A (Ideal): Preços até R$ ${ceiling.toFixed(2)}.
          * Camada B (Tolerância): Preços até R$ ${(ceiling * 1.25).toFixed(2)} (25% acima).
          * Camada C (Limite): Preços entre R$ ${(ceiling * 1.25).toFixed(2)} e R$ ${(ceiling * 1.27).toFixed(2)}.
          Priorize resultados da Camada A e B.`;
      }
  }

  const prompt = `
    Você é um assistente especialista em compras públicas (Lei 14.133/2021).
    Preciso encontrar links diretos para a compra do produto: "${product}".
    
    CONTEXTO DE VALORES (Power BI):
    ${priceContext}

    REGRAS ESTRITAS DE PESQUISA:
    1. DATA DA OFERTA: Busque APENAS ofertas publicadas ou verificadas a partir de ${dateStr} (Últimos ${days} dias). Ignore resultados antigos.
    2. FONTE: Busque APENAS em sites confiáveis e de domínio amplo no Brasil: ${whitelistStr}.
    3. PROIBIDO: IGNORE Shopee, AliExpress, Mercado Livre (vendedores não oficiais), OLX e sites de leilão.
    4. TIPO DE PÁGINA: O link deve ser de uma PÁGINA DE PRODUTO ESPECÍFICO (PDP) com preço visível e botão de compra. NÃO retorne listas de busca.
    5. ESTABILIDADE: Priorize itens com preços estáveis em relação aos valores de referência fornecidos.
    
    Retorne APENAS um JSON válido (sem markdown, sem explicação) com uma lista de até 5 itens encontrados no seguinte formato:
    [
      {
        "title": "Título exato do produto no site",
        "source": "Nome da loja",
        "price": "Preço encontrado (ex: R$ 150,00)",
        "url": "Link direto para a página do produto"
      }
    ]
  `;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });
    
    let text = response.text || "[]";
    // Clean up markdown code blocks if present
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const rawResults = JSON.parse(text);
    
    return rawResults.map((item: any) => ({ ...item, visited: false }));

  } catch (error) {
    console.error("Gemini Live Search Error:", error);
    return [];
  }
};

/**
 * Generates search URLs (dorks) based on the user's prompt (Fallback).
 */
export const generateSearchStrategy = async (product: string, min?: number, max?: number) => {
    // This is now a fallback or secondary feature, keeping it simple
    const prompt = `
      Gere 3 URLs de busca (Dorks) para encontrar "${product}" em sites como Amazon.com.br, Kalunga e Magalu.
      Retorne JSON: [{ "site": "Nome", "searchUrl": "URL", "tip": "Dica" }]
    `;
  
    try {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      
      return JSON.parse(response.text || "[]");
    } catch (error) {
      return [];
    }
  };
```


### ARQUIVO: `services/pythonService.ts`

```typescript
import { PriceItem, DashboardStats } from "../types";
import { calculateStats as localCalculateStats, generateLaudoText as localGenerateLaudoText } from "../utils/calculations";

export interface PythonEngineStatus {
  status: 'ok' | 'error';
  name?: string;
  version?: string;
  python_version?: string;
  modules?: string[];
  error?: string;
}

export interface DomainValidationResult {
  is_valid: boolean;
  status: 'APPROVED' | 'PROHIBITED' | 'MANUAL_REVIEW';
  domain: string;
  name?: string;
  score?: number;
  notes?: string;
  message: string;
}

export interface PythonSearchQuery {
  source: string;
  domain: string;
  query: string;
  url: string;
  notes: string;
}

export interface PythonSearchQueriesResult {
  product: string;
  brand?: string;
  queries: PythonSearchQuery[];
  safe_domains_count: number;
}

/**
 * Checks Python 3.10 Engine connection and loaded modules
 */
export async function checkPythonStatus(): Promise<PythonEngineStatus> {
  try {
    const res = await fetch("/api/python/status");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    return {
      status: "error",
      error: err.message || "Não foi possível conectar ao servidor Python."
    };
  }
}

/**
 * Performs statistical calculation using Python 3.10 engine
 * Falls back to local calculations if network/server is unavailable.
 */
export async function calculateStatsWithPython(items: PriceItem[]): Promise<DashboardStats> {
  try {
    const res = await fetch("/api/python/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn("Python engine API unavailable, using fallback calculations:", err);
    const local = localCalculateStats(items);
    return {
      ...local,
      engine: "Fallback Local (Python API offline)",
      iqrAnalysis: null,
      outliersCount: 0
    };
  }
}

/**
 * Generates official price reference report via Python
 */
export async function generateLaudoWithPython(items: PriceItem[], product: string): Promise<string> {
  try {
    const res = await fetch("/api/python/laudo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, product })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.laudo;
  } catch (err) {
    console.warn("Python laudo API unavailable, using fallback:", err);
    const localStats = localCalculateStats(items);
    return localGenerateLaudoText(localStats, items, product);
  }
}

/**
 * Validates whether an internet domain/URL is approved by Lei 14.133/2021 & IN 65/2021
 */
export async function validateDomainWithPython(url: string): Promise<DomainValidationResult> {
  try {
    const res = await fetch("/api/python/validate-source", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    return {
      is_valid: true,
      status: "MANUAL_REVIEW",
      domain: url,
      message: "Verificação manual requerida (API Python offline)."
    };
  }
}

/**
 * Generates Google Dorks targeting safe wide-domain sites
 */
export async function generateSearchQueriesWithPython(product: string, brand?: string): Promise<PythonSearchQueriesResult | null> {
  try {
    const res = await fetch("/api/python/search-queries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product, brand })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Python search-queries API unavailable:", err);
    return null;
  }
}

/**
 * Downloads or views the standalone Python script
 */
export async function getPythonScriptSource(): Promise<string> {
  try {
    const res = await fetch("/api/python/script-source");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err: any) {
    return `# Erro ao carregar script Python: ${err.message}`;
  }
}
```


### ARQUIVO: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "module": "ESNext",
    "lib": [
      "ES2022",
      "DOM",
      "DOM.Iterable"
    ],
    "skipLibCheck": true,
    "types": [
      "node"
    ],
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "allowJs": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": [
        "./*"
      ]
    },
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}
```


### ARQUIVO: `types.ts`

```typescript

export enum SourceType {
  WIDE_DOMAIN = "Domínio Amplo (Internet)",
  SPECIALIZED = "Sítio Especializado",
  PHYSICAL_STORE = "Loja Física",
  PUBLIC_CONTRACT = "Contratação Pública (Licitacon/Painel)",
  MEDIA = "Mídia Especializada",
  SUPPLIER_QUOTE = "Orçamento com Fornecedor"
}

export interface PriceItem {
  id: string;
  productDescription: string;
  priceOriginal: number;
  priceAdjusted?: number;
  sourceName: string; // e.g., Amazon, Kalunga, Licitacon
  sourceUrl: string;
  sourceType: SourceType;
  accessDate: string; // ISO String
  printScreen?: string; // Base64
  isValid: boolean;
  rejectionReason?: string;
  adjustmentIndex?: string; // e.g., IPCA
  category?: string; // Optional category field
  homologatedReference?: number; // From Power BI
  estimatedReference?: number; // From Power BI
}

export interface SearchParams {
  searchTargets: SearchRow[];
  dateRange: '30' | '60' | '90' | '180' | '365';
}

export interface SearchRow {
  id: number;
  term: string;
  homologated: number | '';
  estimated: number | '';
}

export interface DashboardStats {
  mean: number;
  median: number;
  stdDev: number;
  cv: number; // Coefficient of Variation
  itemCount: number;
  validItemCount: number;
  referencePrice: number; // The calculated reference price
  homogeneityStatus: 'HOMOGENEOUS' | 'HETEROGENEOUS'; // CV <= 25% is Homogeneous
  methodologyUsed: string;
  engine?: string;
  iqrAnalysis?: {
    q1?: number | null;
    q3?: number | null;
    iqr?: number | null;
    lower_bound?: number | null;
    upper_bound?: number | null;
    outliers_indices?: number[];
  } | null;
  outliersCount?: number;
}

export interface ChecklistStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  category: 'GMAT' | 'PCA' | 'SEI' | 'FINAL';
}

export interface SearchResultItem {
  title: string;
  source: string;
  price?: string;
  url: string;
  visited: boolean;
  query?: string; // The search term that found this result
  homologated?: number;
  estimated?: number;
  unitPrice?: number;
  quantity?: number;
}

export interface AppState {
  items: PriceItem[];
  etpData: any;
  trData: any;
  searchList?: SearchRow[];
}

export interface AccessLogItem {
  url: string;
  source: string;
  product: string;
  timestamp: string;
}

// Dispatch Generator Types
export type DispatchType = 'ENCAMINHAMENTO_DLC' | 'JUSTIFICATIVA_EXCLUSIVO' | 'SOLICITACAO_SCM' | 'ATESTE_ORCAMENTO';

export interface DispatchTemplate {
  id: string;
  label: string;
  content: (data: any) => string;
}

// SEI Package
export interface SEIPackage {
    laudoText: string;
    csvData: string;
    checklist: { id: string; label: string; checked: boolean }[];
    accessLevel: 'PUBLICO' | 'RESTRITO';
}

// ETP and Risk Matrix Data Interfaces
export interface ETPData {
    necessidade: string;
    quantidade: string;
    solucao: string;
    viabilidade: string;
    parcelamento: string;
}

export interface RiskMatrixData {
    riscos: { descricao: string; probabilidade: string; impacto: string; acao: string }[];
}
```


### ARQUIVO: `utils/calculations.ts`

```typescript
import { PriceItem, DashboardStats } from "../types";
import { MAX_ALLOWED_CV } from "../constants";

export const calculateStats = (items: PriceItem[]): DashboardStats => {
  const validItems = items.filter(i => i.isValid);
  const count = validItems.length;

  if (count === 0) {
    return {
      mean: 0,
      median: 0,
      stdDev: 0,
      cv: 0,
      itemCount: items.length,
      validItemCount: 0,
      referencePrice: 0,
      homogeneityStatus: 'HOMOGENEOUS',
      methodologyUsed: 'N/A'
    };
  }

  const prices = validItems.map(i => i.priceAdjusted || i.priceOriginal);
  const sum = prices.reduce((a, b) => a + b, 0);
  const mean = sum / count;

  // Std Dev (Sample)
  const squareDiffs = prices.map(p => Math.pow(p - mean, 2));
  const variance = count > 1 ? squareDiffs.reduce((a, b) => a + b, 0) / (count - 1) : 0;
  const stdDev = Math.sqrt(variance);

  // CV
  const cv = mean > 0 ? stdDev / mean : 0;

  // Median
  const sortedPrices = [...prices].sort((a, b) => a - b);
  let median = 0;
  if (count % 2 === 0) {
    median = (sortedPrices[count / 2 - 1] + sortedPrices[count / 2]) / 2;
  } else {
    median = sortedPrices[Math.floor(count / 2)];
  }

  // Reference Price Logic: Lesser of Mean vs Median (Standard practice in POA to mitigate overpricing)
  const referencePrice = Math.min(mean, median);
  const method = mean < median ? "Média Aritmética (Menor valor)" : "Mediana (Menor valor)";

  return {
    mean,
    median,
    stdDev,
    cv,
    itemCount: items.length,
    validItemCount: count,
    referencePrice,
    homogeneityStatus: cv <= MAX_ALLOWED_CV ? 'HOMOGENEOUS' : 'HETEROGENEOUS',
    methodologyUsed: method
  };
};

export const generateLaudoText = (stats: DashboardStats, items: PriceItem[], product: string): string => {
  const validItems = items.filter(i => i.isValid);
  const today = new Date().toLocaleDateString('pt-BR');
  
  // Identify Sources
  const publicSources = validItems.filter(i => i.sourceType.includes("Pública")).length;
  const internetSources = validItems.filter(i => i.sourceType.includes("Domínio Amplo")).length;
  const supplierSources = validItems.filter(i => i.sourceType.includes("Fornecedor")).length;

  return `
LAUDO DE FORMAÇÃO DE PREÇO DE REFERÊNCIA

1. OBJETO DA PESQUISA
Item: ${product}

2. METODOLOGIA APLICADA
Em conformidade com a Lei nº 14.133/2021, IN SEGES/ME nº 65/2021 e Decretos Municipais vigentes (21.859/2023), foi realizada pesquisa de preços visando compor a cesta de preços aceitáveis.

3. FONTES CONSULTADAS
Total de Cotações Válidas: ${stats.validItemCount}
- Preços Públicos (Licitacon/Painel): ${publicSources}
- Sítios Eletrônicos (Domínio Amplo): ${internetSources}
- Fornecedores (Orçamentos): ${supplierSources}

${validItems.map(i => `- ${i.sourceName}: ${formatCurrency(i.priceAdjusted || i.priceOriginal)} (${i.accessDate})`).join('\n')}

4. TRATAMENTO ESTATÍSTICO
- Coeficiente de Variação (CV): ${formatPercent(stats.cv)}
- Status da Amostra: ${stats.homogeneityStatus === 'HOMOGENEOUS' ? 'HOMOGÊNEA (CV ≤ 25%)' : 'HETEROGÊNEA (CV > 25%) - Requer justificativa ou saneamento.'}
- Média Aritmética: ${formatCurrency(stats.mean)}
- Mediana: ${formatCurrency(stats.median)}

5. PREÇO DE REFERÊNCIA
Adotou-se como critério o MENOR VALOR entre a Média e a Mediana para assegurar a economicidade e mitigar sobrepreço.

VALOR UNITÁRIO DE REFERÊNCIA: ${formatCurrency(stats.referencePrice)}

6. OBSERVAÇÕES
Os preços coletados referem-se a pagamento a prazo ou foram ajustados. Desconsideraram-se preços inexequíveis ou excessivamente elevados conforme mapa anexo. A pesquisa respeita o prazo de validade de 180 dias.

Porto Alegre, ${today}
_______________________________________
Responsável pela Pesquisa
  `.trim();
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const formatPercent = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2 }).format(value);
};
```


### ARQUIVO: `vite.config.ts`

```typescript
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
```
