
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
