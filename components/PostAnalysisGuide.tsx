
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
