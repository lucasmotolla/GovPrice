
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
