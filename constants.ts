
export const WHITELIST_DOMAINS = [
  "amazon.com.br",
  "magazineluiza.com.br",
  "kalunga.com.br",
  "americanas.com.br",
  "gimba.com.br",
  "staples.com.br",
  "mercadolivre.com.br/loja/", // Only official stores
  "webmotors.com.br",
  "wimoveis.com.br",
  "imovelweb.com.br",
  "kabum.com.br",
  "dell.com",
  "lenovo.com",
  "pichau.com.br",
  "terabyteshop.com.br",
  "zaffari.com.br",
  "leroymerlin.com.br"
];

export const PUBLIC_DATA_SOURCES = [
  { name: "Licitacon Cidadão (TCE-RS)", url: "https://portal.tce.rs.gov.br/aplicprod/f?p=50500:1" },
  { name: "Painel de Preços (Gov.br)", url: "https://paineldeprecos.planejamento.gov.br/" },
  { name: "Banco de Preços em Saúde (BPS)", url: "https://infoms.saude.gov.br/extensions/SEIDIGI_DEMAS_BPS/SEIDIGI_DEMAS_BPS.html" },
  { name: "Compras.rs (CELIC)", url: "https://www.compras.rs.gov.br/" }
];

export const BLACKLIST_DOMAINS = [
  "shopee.com.br",
  "pt.aliexpress.com",
  "olx.com.br",
  "enjoei.com.br",
  "shein.com",
  "mercadolivre.com.br" // General marketplace without official store check
];

export const PROCEMPA_POWERBI_URL = "https://powerbi.procempa.com.br/reports/powerbi/Administra%C3%A7%C3%A3o%20e%20Planejamento/Self%20Service/SMPG-DLC/Gest%C3%A3o%20DLC";

// IN SEGES 65/2021 & Municipal Decrees limit for Coefficient of Variation
export const MAX_ALLOWED_CV = 0.25;

// Links for GMAT/SEI/REM
export const GMAT_URL = "http://gmat.procempa.com.br/gmat/index.jsp";
export const SEI_PORTAL_URL = "https://portalsei.procempa.com.br/";
export const SEI_WORK_URL = "https://sei.procempa.com.br/controlador.php?acao=procedimento_controlar&acao_origem=procedimento_controlar&tipo_filtro=&infra_sistema=100000093&infra_unidade_atual=110003674&infra_hash=4898a4987331f03e344e9b3807807b7bb9764deed10c7547d3286e01c8d3aae4";
export const NOVOREM_URL = "https://novorem.procempa.com.br/";
