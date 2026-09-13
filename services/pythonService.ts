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
