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