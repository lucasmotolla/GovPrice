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
