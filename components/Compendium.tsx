
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
