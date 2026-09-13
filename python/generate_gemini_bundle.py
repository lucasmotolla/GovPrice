#!/usr/bin/env python3
"""
Script que compila todo o código-fonte do projeto em um único documento Markdown/Texto
estruturado para alimentar o Google Gemini, Claude, ChatGPT ou outros LLMs.
"""

import os

EXCLUDE_DIRS = {"node_modules", "dist", ".git", "__pycache__", ".cache", "public"}
EXCLUDE_FILES = {"package-lock.json", "bun.lock", ".tmp_project_export.zip"}

def generate_gemini_bundle(output_file: str):
    files_to_bundle = []
    for root, dirs, files in os.walk("."):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith(".")]
        for f in files:
            if f in EXCLUDE_FILES or f.endswith(".zip") or f.endswith(".pyc"):
                continue
            rel = os.path.relpath(os.path.join(root, f), ".")
            files_to_bundle.append(rel)

    files_to_bundle.sort()

    lines = []
    lines.append("# PROJETO GOVPRICE - CÓDIGO-FONTE COMPLETO PARA ANÁLISE NO GEMINI\n")
    lines.append("Este documento contém todo o código-fonte do projeto GovPrice: Motor Estatístico em Python 3.10, Servidor Node/Express Full-Stack e Interface React com TypeScript, aderente à Lei 14.133/2021 e IN SEGES/ME nº 65/2021.\n")
    lines.append("## ESTRUTURA DO PROJETO E ÍNDICE DE ARQUIVOS:\n")
    for f in files_to_bundle:
        lines.append(f"- {f}")
    lines.append("\n" + "="*80 + "\n")

    for f in files_to_bundle:
        lines.append(f"\n### ARQUIVO: `{f}`\n")
        ext = f.split(".")[-1].lower()
        lang_map = {
            "py": "python",
            "ts": "typescript",
            "tsx": "tsx",
            "js": "javascript",
            "json": "json",
            "html": "html",
            "css": "css",
            "gitignore": "gitignore"
        }
        lang = lang_map.get(ext, "")
        lines.append(f"```{lang}")
        try:
            with open(f, "r", encoding="utf-8") as fp:
                lines.append(fp.read().rstrip())
        except Exception as err:
            lines.append(f"# Erro ao ler: {err}")
        lines.append("```\n")

    full_content = "\n".join(lines)
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as out_fp:
        out_fp.write(full_content)

    print(f"Bundle gerado com sucesso: {output_file} ({len(full_content)} caracteres, {len(files_to_bundle)} arquivos)")

if __name__ == "__main__":
    generate_gemini_bundle("public/govprice_full_code_for_gemini.md")
    generate_gemini_bundle("public/govprice_full_code_for_gemini.txt")
