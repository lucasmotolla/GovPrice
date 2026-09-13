
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
