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
