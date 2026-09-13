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
