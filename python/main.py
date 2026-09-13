#!/usr/bin/env python3
"""
Ponto de Entrada Principal (CLI e Bridge JSON) do Motor Python
"""

import sys
import json
import argparse
from statistical_engine import calculate_stats, generate_laudo_text, detect_outliers_iqr
from safe_search_engine import validate_domain, generate_search_queries, SAFE_DOMAINS

def handle_calculate(payload: dict) -> dict:
    items = payload.get("items", [])
    return calculate_stats(items)

def handle_laudo(payload: dict) -> dict:
    items = payload.get("items", [])
    product = payload.get("product", "Item de Consumo / Serviço")
    stats = calculate_stats(items)
    laudo = generate_laudo_text(stats, items, product)
    return {
        "stats": stats,
        "laudo": laudo,
        "engine": "Python 3.10"
    }

def handle_validate_source(payload: dict) -> dict:
    url_or_domain = payload.get("url", "")
    return validate_domain(url_or_domain)

def handle_search_queries(payload: dict) -> dict:
    product = payload.get("product", "")
    brand = payload.get("brand")
    queries = generate_search_queries(product, brand)
    return {
        "product": product,
        "brand": brand,
        "queries": queries,
        "safe_domains_count": len(SAFE_DOMAINS)
    }

def main():
    parser = argparse.ArgumentParser(description="GovPrice Python Engine")
    parser.add_argument("--action", required=True, choices=["calculate", "laudo", "validate_source", "search_queries", "info"])
    args = parser.parse_args()
    
    if args.action == "info":
        result = {
            "name": "GovPrice Python Engine",
            "version": "1.0.0",
            "python_version": sys.version,
            "modules": ["statistical_engine", "safe_search_engine"]
        }
        print(json.dumps(result, ensure_ascii=False))
        return

    # Lê o JSON de entrada da stdin
    try:
        input_data = sys.stdin.read().strip()
        payload = json.loads(input_data) if input_data else {}
    except Exception as e:
        print(json.dumps({"error": f"JSON inválido na entrada: {str(e)}"}), file=sys.stderr)
        sys.exit(1)
        
    try:
        if args.action == "calculate":
            output = handle_calculate(payload)
        elif args.action == "laudo":
            output = handle_laudo(payload)
        elif args.action == "validate_source":
            output = handle_validate_source(payload)
        elif args.action == "search_queries":
            output = handle_search_queries(payload)
        else:
            output = {"error": f"Ação desconhecida: {args.action}"}
            
        print(json.dumps(output, ensure_ascii=False, indent=2))
    except Exception as e:
        print(json.dumps({"error": f"Falha na execução Python: {str(e)}"}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
