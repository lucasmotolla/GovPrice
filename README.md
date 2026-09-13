# GovPrice - Assistente de Pesquisa e Formação de Preços

Sistema full-stack para realização, saneamento estatístico e documentação de pesquisas de preços em contratações públicas brasileiras, em estrita conformidade com a **Lei Federal nº 14.133/2021** e a **Instrução Normativa SEGES/ME nº 65/2021**.

---

## 🏛️ Principais Recursos

- **Motor Estatístico em Python 3.10**:
  - Média Aritmética, Mediana, Desvio Padrão Amostral e Coeficiente de Variação ($CV \le 25\%$).
  - Detecção e expurgo automático de *outliers* utilizando o método do Intervalo Interquartil ($Q_1 - 1.5 \times IQR$ a $Q_3 + 1.5 \times IQR$).
  - Preço de Referência conservador para proteção do erário: $\min(\text{Média}, \text{Mediana})$.
- **Validação de Sítios de Domínio Amplo (IN 65/2021)**:
  - Classificação e verificação de sítios de domínio amplo seguro (Amazon, Magazine Luiza, Kalunga, Casas Bahia, Kabum, Leroy Merlin, etc.).
  - Bloqueio imediato de plataformas vedadas (marketplaces C2C/pessoas físicas como Shopee, OLX, Enjoei).
  - Gerador de buscas estruturadas (*Google Dorks*) com restrição a domínios seguros e portais públicos (PNCP/Comprasnet).
- **Integração com o SEI (Sistema Eletrônico de Informações)**:
  - Geração com 1 clique do **Mapa Comparativo de Preços** formatado em tabela HTML pronta para colar no SEI.
  - Emissão automatizada do **Laudo Técnico e Justificativa de Metodologia** para instrução processual.
- **Console Interativo Python**:
  - Diagnóstico em tempo real do interpretador Python 3.10.
  - Testador de cálculos estatísticos e validador de fontes.
  - Script autônomo em linha de comando (`govprice_pesquisa_precos.py`).
  - Exportador unificado de código para análise e evolução com o Google Gemini (`.md` / `.txt`).

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- **Node.js** 18+ ou 20+
- **Python** 3.10+ (bibliotecas nativas `math`, `statistics`, `json`, `sys`, `urllib`)

### Instalação

1. Clone o repositório ou descompacte o arquivo do projeto:
   ```bash
   git clone <URL_DO_REPOSITORIO>
   cd govprice
   ```

2. Instale as dependências do Node:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

4. Acesse a aplicação no navegador em `http://localhost:3000`.

---

## 🐍 Executando o Motor Python via Terminal

Você também pode utilizar o motor estatístico diretamente via linha de comando sem precisar iniciar o servidor web:

```bash
# Modo Interativo
python3 python/govprice_pesquisa_precos.py

# Modo CLI Direto com argumentos
python3 python/govprice_pesquisa_precos.py \
  --objeto "Monitor LED 27 polegadas 4K" \
  --precos 1200.00 1250.00 1190.00 1220.00
```

---

## 📂 Estrutura do Projeto

```
├── python/
│   ├── statistical_engine.py       # Motor estatístico (Média, Mediana, DP, CV%, IQR)
│   ├── safe_search_engine.py      # Validador de fontes da IN 65/2021 e Google Dorks
│   ├── main.py                    # Ponte JSON/CLI entre Python e o servidor Express
│   ├── export_project.py          # Gerador automatizado de pacotes ZIP
│   ├── generate_gemini_bundle.py  # Empacotador para contexto do Gemini (LLM)
│   └── govprice_pesquisa_precos.py# Script autônomo CLI em Python
├── components/                    # Componentes React (PriceMap, PythonConsole, SEI, etc.)
├── services/                      # Camadas de integração (pythonService e geminiService)
├── utils/                         # Cálculos auxiliares e formatação monetária (BRL)
├── server.ts                      # Servidor Full-Stack Express integrado ao Python
├── metadata.json                  # Metadados e configurações da aplicação
├── package.json                   # Dependências e scripts
└── vite.config.ts                 # Configurações do Vite
```

---

## 📄 Licença e Conformidade

Desenvolvido para conformidade técnica com:
- **Lei Federal nº 14.133, de 1º de abril de 2021** (Nova Lei de Licitações e Contratos Administrativos).
- **Instrução Normativa SEGES/ME nº 65, de 7 de julho de 2021** (Procedimento para pesquisa de preços).
