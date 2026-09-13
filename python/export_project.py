#!/usr/bin/env python3
"""
Gera um arquivo ZIP completo e limpo do código-fonte do projeto GovPrice
(Exclui node_modules, dist, cache e arquivos temporários)
"""

import os
import sys
import zipfile
import io

EXCLUDE_DIRS = {
    "node_modules",
    "dist",
    ".git",
    ".cache",
    "__pycache__",
    ".npm"
}

EXCLUDE_FILES = {
    ".DS_Store",
    "package-lock.json"  # opcional, mas pode manter se quiser
}

def create_project_zip(root_dir: str) -> bytes:
    buffer = io.BytesIO()
    
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(root_dir):
            # Filtra diretórios excluídos in-place
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith(".")]
            
            for file in files:
                if file in EXCLUDE_FILES or file.endswith(".pyc") or file.endswith(".log"):
                    continue
                
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, root_dir)
                
                # Não incluir o próprio zip se for salvo na raiz
                if rel_path.endswith(".zip") or rel_path.endswith(".tar.gz"):
                    continue
                    
                zf.write(full_path, arcname=rel_path)
                
    buffer.seek(0)
    return buffer.getvalue()

if __name__ == "__main__":
    out_name = sys.argv[1] if len(sys.argv) > 1 else "govprice_projeto_completo.zip"
    zip_bytes = create_project_zip(os.getcwd())
    with open(out_name, "wb") as f:
        f.write(zip_bytes)
    print(f"Exportado com sucesso: {out_name} ({len(zip_bytes)} bytes)")
