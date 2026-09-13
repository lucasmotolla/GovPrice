#!/usr/bin/env python3
"""
GovPrice - Script Autônomo em Python para Formação de Preço de Referência
Em conformidade com a Lei Federal nº 14.133/2021 e IN SEGES/ME nº 65/2021.

Como usar via terminal:
    python3 govprice_pesquisa_precos.py --objeto "Cadeira Ergonômica NR17" --precos 650.0 690.0 720.0 680.0
    ou execute interativamente:
    python3 govprice_pesquisa_precos.py
"""

import sys
import json
import argparse
import statistics
from datetime import datetime

MAX_ALLOWED_CV = 0.25

def format_brl(val: float) -> str:
    s = f"{val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"R$ {s}"

def run_analysis(objeto: str, precos: list, fontes: list = None):
    if not precos:
        print("Erro: Nenhum preço fornecido para cálculo.")
        return

    n = len(precos)
    media = statistics.mean(precos)
    mediana = statistics.median(precos)
    desvio_padrao = statistics.stdev(precos) if n > 1 else 0.0
    cv = (desvio_padrao / media) if media > 0 else 0.0
    homogenea = cv <= MAX_ALLOWED_CV
    
    # Preço de referência: Menor entre média e mediana
    preco_ref = min(media, mediana)
    metodo = "Média Aritmética" if media <= mediana else "Mediana"

    # IQR Outlier check
    iqr_str = "Amostra pequena (<4 itens) para IQR"
    if n >= 4:
        q1, _, q3 = statistics.quantiles(precos, n=4)
        iqr = q3 - q1
        lim_inf = max(0.0, q1 - 1.5 * iqr)
        lim_sup = q3 + 1.5 * iqr
        iqr_str = f"Faixa aceitável IQR: [{format_brl(lim_inf)} a {format_brl(lim_sup)}]"

    print("=" * 65)
    print(" GOVPRICE - RELATÓRIO ESTATÍSTICO DE FORMAÇÃO DE PREÇO (PYTHON)")
    print(" Conforme Lei 14.133/2021 e IN 65/2021")
    print("=" * 65)
    print(f"Objeto: {objeto}")
    print(f"Data: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    print(f"Número de Cotações: {n}")
    print("-" * 65)
    print("AMOSTRAS:")
    for idx, p in enumerate(precos, 1):
        fonte_nome = fontes[idx - 1] if fontes and idx - 1 < len(fontes) else f"Cotação {idx}"
        print(f"  [{idx}] {fonte_nome}: {format_brl(p)}")
    print("-" * 65)
    print("TRATAMENTO ESTATÍSTICO:")
    print(f"  • Média Aritmética:          {format_brl(media)}")
    print(f"  • Mediana:                   {format_brl(mediana)}")
    print(f"  • Desvio Padrão Amostral:    {format_brl(desvio_padrao)}")
    print(f"  • Coeficiente Variação (CV): {cv * 100:.2f}%")
    print(f"  • Homogeneidade (CV <= 25%): {'HOMOGÊNEA (Aprovada)' if homogenea else 'HETEROGÊNEA (Requer justificativa)'}")
    print(f"  • {iqr_str}")
    print("-" * 65)
    print(f"CRITÉRIO ADOTADO: Menor entre Média e Mediana ({metodo})")
    print(f">>> PREÇO ESTIMADO DE REFERÊNCIA: {format_brl(preco_ref)} <<<")
    print("=" * 65)

def main():
    parser = argparse.ArgumentParser(description="Formador de Preços de Referência em Python")
    parser.add_argument("--objeto", type=str, default="Item de Consumo", help="Descrição do objeto")
    parser.add_argument("--precos", nargs="+", type=float, help="Lista de preços numéricos")
    args = parser.parse_args()

    if args.precos:
        run_analysis(args.objeto, args.precos)
    else:
        print("--- Modo Interativo GovPrice Python ---")
        obj = input("Digite o nome do objeto licitado: ").strip() or "Material de Consumo"
        print("Digite os preços das cotações válidas separados por espaço (ex: 120.50 118.00 135.90):")
        raw = input("Preços: ").strip()
        try:
            precos = [float(x.replace(",", ".")) for x in raw.split()]
            run_analysis(obj, precos)
        except Exception as e:
            print(f"Erro ao converter preços: {e}")

if __name__ == "__main__":
    main()
