/**
 * ============================================================
 * SIMULADOR TRIBUTÁRIO — PF vs PJ | Êxito Contábil
 * script.js v2.0 — Correções aplicadas:
 *   ✅ Salário mínimo 2026: R$ 1.621,00
 *   ✅ PF autônomo = sempre serviço (ISS obrigatório)
 *   ✅ Fator R dinâmico com indicação do Anexo correto
 *   ✅ Metodologia de cálculo da reforma exibida no formulário
 *   ✅ Detalhe de cada tributo nos cards (base de cálculo)
 *   ✅ Toggle tema escuro/claro
 * ============================================================
 */

'use strict';

// ============================================================
// ✅ CONFIGURAÇÃO DO ESCRITÓRIO — EDITE AQUI
// ============================================================

/**
 * WHATSAPP DO ESCRITÓRIO
 * Formato: código do país + DDD + número, SEM espaços ou símbolos.
 * Exemplos:
 *   Brasil, João Pessoa (83): '5583981234567'
 *   Brasil, São Paulo  (11): '5511999887766'
 *
 * Para descobrir seu número formatado acesse:
 *   https://wa.me/SEU_NUMERO  (substitua SEU_NUMERO pelo número)
 */
const WA_NUMERO  = '5583981234567';   // ← ALTERE AQUI
const WA_MENSAGEM = 'Olá! Vim pelo Simulador Tributário PF vs PJ e gostaria de saber mais sobre abertura de CNPJ.';

// ============================================================
// 1. CONSTANTES TRIBUTÁRIAS
// ============================================================

/** Tabela IRPF mensal 2026 — MP 1.294/2024 */
const TABELA_IRPF = [
  { ate: 2824.00,  aliquota: 0,     deducao: 0       },
  { ate: 3751.05,  aliquota: 0.075, deducao: 211.80  },
  { ate: 4664.68,  aliquota: 0.15,  deducao: 492.97  },
  { ate: 6101.06,  aliquota: 0.225, deducao: 841.97  },
  { ate: Infinity, aliquota: 0.275, deducao: 1147.26 }
];

const TETO_INSS           = 7786.02;  // teto INSS 2024 (atualizar em 2026 conforme portaria)
const ALIQ_INSS_PF        = 0.20;     // contribuinte individual autônomo
const ALIQ_INSS_PROLABORE = 0.11;     // sócio-administrador

/** ✅ CORRETO: Salário mínimo 2026 */
const SALARIO_MINIMO_2026 = 1621.00;

/**
 * Fator R: razão folha/receita.
 * Se >= 28%, empresa enquadrada no Anexo III mesmo sendo profissão regulamentada.
 */
const FATOR_R_MINIMO = 0.28;

/** Simples Nacional — Anexo III (serviços gerais, fator R ≥ 28%) */
const SIMPLES_ANEXO_III = [
  { limite: 180000,  aliquota: 0.06,  deducao: 0      },
  { limite: 360000,  aliquota: 0.112, deducao: 9360   },
  { limite: 720000,  aliquota: 0.135, deducao: 17640  },
  { limite: 1800000, aliquota: 0.16,  deducao: 35640  },
  { limite: 3600000, aliquota: 0.21,  deducao: 125640 },
  { limite: 4800000, aliquota: 0.33,  deducao: 648000 }
];

/** Simples Nacional — Anexo V (profissões regulamentadas, fator R < 28%) */
const SIMPLES_ANEXO_V = [
  { limite: 180000,  aliquota: 0.155, deducao: 0      },
  { limite: 360000,  aliquota: 0.18,  deducao: 4500   },
  { limite: 720000,  aliquota: 0.195, deducao: 9900   },
  { limite: 1800000, aliquota: 0.205, deducao: 17100  },
  { limite: 3600000, aliquota: 0.23,  deducao: 62100  },
  { limite: 4800000, aliquota: 0.305, deducao: 540000 }
];


// ============================================================
// 2. CÁLCULO — PESSOA FÍSICA (AUTÔNOMO PRESTADOR DE SERVIÇOS)
// ============================================================

/**
 * Calcula os impostos de um autônomo (PF prestador de serviços).
 * PF autônomo SEMPRE presta serviço — ISS é obrigatório.
 *
 * @param {number} receita       - Receita bruta mensal (R$)
 * @param {number} despesas      - Despesas dedutíveis mensais (R$)
 * @param {number} issAliquota   - Alíquota ISS em decimal (ex: 0.05)
 * @returns {{ inss, iss, irpf, total, liquido, percentual, baseIrpf }}
 */
function calcularPF(receita, despesas = 0, issAliquota = 0.05) {

  // INSS — Contribuinte Individual: 20% sobre receita limitada ao teto
  const baseInss = Math.min(receita, TETO_INSS);
  const inss     = baseInss * ALIQ_INSS_PF;

  // ISS — autônomo prestador de serviços sempre recolhe ISS sobre receita bruta
  const iss = receita * issAliquota;

  // IRPF — dedução simplificada: 20% da receita, limite R$ 1.396,19/mês
  // (R$ 16.754,34/ano ÷ 12). Inclui despesas comprovadas adicionais.
  const deducaoSimplificada = Math.min(receita * 0.20, 1396.19);
  const baseIrpf = Math.max(0, receita - inss - deducaoSimplificada - despesas);
  const irpf     = calcularIRPF(baseIrpf);

  const total      = inss + iss + irpf;
  const liquido    = receita - total;
  const percentual = receita > 0 ? (total / receita) * 100 : 0;

  return { inss, iss, irpf, total, liquido, percentual, baseIrpf };
}

/**
 * Aplica a tabela progressiva de IRPF.
 * @param {number} base - Base de cálculo já reduzida
 * @returns {number}
 */
function calcularIRPF(base) {
  if (base <= 0) return 0;
  for (const faixa of TABELA_IRPF) {
    if (base <= faixa.ate) {
      return Math.max(0, (base * faixa.aliquota) - faixa.deducao);
    }
  }
  return 0;
}


// ============================================================
// 3. CÁLCULO — PJ (SIMPLES NACIONAL) + FATOR R
// ============================================================

/**
 * Calcula o Fator R: razão entre folha de salários e receita bruta
 * dos últimos 12 meses. Aqui estimamos usando os valores mensais × 12.
 *
 * Fator R ≥ 28% → Anexo III (menor tributação)
 * Fator R < 28% → Anexo V (maior tributação)
 *
 * @param {number} prolabore  - Pró-labore mensal (equivale à "folha")
 * @param {number} receita    - Receita bruta mensal
 * @returns {{ fatorR, anexoRecomendado, percentual }}
 */
function calcularFatorR(prolabore, receita) {
  if (receita <= 0) return { fatorR: 0, anexoRecomendado: 'V', percentual: '0%' };

  // Fator R = (folha 12 meses) / (RBT12)
  // Como usamos valores mensais, a fórmula simplifica para prolabore / receita
  const fatorR = prolabore / receita;
  const anexoRecomendado = fatorR >= FATOR_R_MINIMO ? 'III' : 'V';

  return {
    fatorR,
    anexoRecomendado,
    percentual: (fatorR * 100).toFixed(1) + '%'
  };
}

/**
 * Calcula o DAS pela fórmula oficial da alíquota efetiva (Simples Nacional).
 * Fórmula: Alíq. Efetiva = (RBT12 × Alíq. Nominal − Parcela Dedutível) ÷ RBT12
 *
 * @param {number} receita  - Receita mensal
 * @param {string} anexo    - 'III' ou 'V'
 * @returns {{ das, aliquotaEfetiva }}
 */
function calcularDAS(receita, anexo = 'III') {
  const rbt12  = receita * 12;
  const tabela = anexo === 'III' ? SIMPLES_ANEXO_III : SIMPLES_ANEXO_V;

  if (rbt12 > 4800000) {
    // Acima do limite máximo do Simples Nacional — excluída do regime
    return { das: receita * 0.33, aliquotaEfetiva: 0.33 };
  }

  let aliqNominal = 0;
  let deducao     = 0;

  for (const faixa of tabela) {
    if (rbt12 <= faixa.limite) {
      aliqNominal = faixa.aliquota;
      deducao     = faixa.deducao;
      break;
    }
  }

  const aliquotaEfetiva = ((rbt12 * aliqNominal) - deducao) / rbt12;
  const das = receita * aliquotaEfetiva;

  return { das, aliquotaEfetiva };
}

/**
 * Calcula o custo total de uma PJ no Simples Nacional.
 *
 * @param {number} receita
 * @param {string} anexo
 * @param {boolean} temProLabore
 * @param {number} prolabore       - Mínimo: R$ 1.621,00 (salário mínimo 2026)
 * @param {number} custoContabil
 * @returns {{ das, inssProLabore, custoContabil, total, liquido, percentual, aliquotaEfetiva }}
 */
function calcularPJAtual(receita, anexo = 'III', temProLabore = true, prolabore = SALARIO_MINIMO_2026, custoContabil = 350) {

  const { das, aliquotaEfetiva } = calcularDAS(receita, anexo);

  // INSS sobre pró-labore: 11% (parte do sócio-administrador)
  const inssProLabore = temProLabore
    ? Math.min(prolabore, TETO_INSS) * ALIQ_INSS_PROLABORE
    : 0;

  const total      = das + inssProLabore + custoContabil;
  const liquido    = receita - total;
  const percentual = receita > 0 ? (total / receita) * 100 : 0;

  return { das, inssProLabore, custoContabil, total, liquido, percentual, aliquotaEfetiva };
}


// ============================================================
// 4. CÁLCULO — PJ PÓS-REFORMA (IBS + CBS)
// ============================================================

/**
 * Simula a PJ após a Reforma Tributária (EC 132/2023).
 *
 * O IBS (Imposto sobre Bens e Serviços) + CBS (Contribuição sobre Bens e Serviços)
 * unificam e substituem: PIS, COFINS, ISS e ICMS.
 *
 * Base de cálculo: receita bruta mensal.
 * INSS e contabilidade são mantidos — não são afetados pela reforma.
 *
 * @param {number} receita
 * @param {number} aliquotaReforma  - Alíquota estimada IBS+CBS (ex: 0.265)
 * @param {boolean} temProLabore
 * @param {number} prolabore
 * @param {number} custoContabil
 * @returns {{ ibsCbs, inssProLabore, custoContabil, total, liquido, percentual }}
 */
function calcularPJReforma(receita, aliquotaReforma = 0.265, temProLabore = true, prolabore = SALARIO_MINIMO_2026, custoContabil = 350) {

  // IBS + CBS sobre a receita bruta
  const ibsCbs = receita * aliquotaReforma;

  // INSS pró-labore permanece inalterado
  const inssProLabore = temProLabore
    ? Math.min(prolabore, TETO_INSS) * ALIQ_INSS_PROLABORE
    : 0;

  const total      = ibsCbs + inssProLabore + custoContabil;
  const liquido    = receita - total;
  const percentual = receita > 0 ? (total / receita) * 100 : 0;

  return { ibsCbs, inssProLabore, custoContabil, total, liquido, percentual };
}


// ============================================================
// 5. PONTO DE VIRADA (busca binária)
// ============================================================

/**
 * Calcula a receita a partir da qual abrir CNPJ é mais vantajoso que PF.
 * Usa busca binária entre R$ 500 e R$ 100.000.
 *
 * @returns {number|null} - Receita do ponto de virada, ou null se não encontrado
 */
function calcularPontoVirada(anexo, temProLabore, prolabore, custoContabil, issAliquota) {
  let low      = 500;
  let high     = 100000;
  let resultado = null;

  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2;
    const pf  = calcularPF(mid, 0, issAliquota);
    const pj  = calcularPJAtual(mid, anexo, temProLabore, prolabore, custoContabil);

    if (pj.total < pf.total) {
      resultado = mid;
      high = mid;
    } else {
      low = mid;
    }

    if (high - low < 10) break;
  }

  return resultado;
}


// ============================================================
// 6. ATUALIZAÇÃO DINÂMICA DO FATOR R
// ============================================================

/**
 * Atualiza o display do Fator R sempre que receita ou pró-labore mudam.
 * Sugere automaticamente o Anexo correto.
 */
function atualizarFatorR() {
  const receita    = parseFloat(document.getElementById('receita').value) || 0;
  const prolabore  = parseFloat(document.getElementById('prolabore').value) || SALARIO_MINIMO_2026;
  const temPL      = document.getElementById('temProLabore').checked;

  const boxFR   = document.getElementById('fatorRBox');
  const elValor = document.getElementById('fatorRValor');
  const elResult= document.getElementById('fatorRResultado');

  if (!temPL || receita <= 0) {
    if (elValor)  elValor.textContent  = '—';
    if (elResult) elResult.textContent = '';
    return;
  }

  const { fatorR, anexoRecomendado, percentual } = calcularFatorR(prolabore, receita);

  elValor.textContent = percentual;

  if (fatorR >= FATOR_R_MINIMO) {
    elValor.style.color = 'var(--green)';
    elResult.className  = 'fator-r-resultado';
    elResult.style.background = 'var(--green-dim)';
    elResult.style.color      = 'var(--green)';
    elResult.style.border     = '1px solid var(--green)';
    elResult.innerHTML = `✅ Fator R ≥ 28% — use <strong>Anexo III</strong> (menor alíquota). O pró-labore/folha representa ${percentual} da receita.`;
    // Sugerir troca de anexo
    const selectAnexo = document.getElementById('anexo');
    if (selectAnexo.value !== 'III') {
      elResult.innerHTML += ' <em>— considere alterar o Anexo acima para III.</em>';
    }
  } else {
    elValor.style.color = 'var(--amber)';
    elResult.className  = 'fator-r-resultado';
    elResult.style.background = 'var(--amber-dim)';
    elResult.style.color      = 'var(--amber)';
    elResult.style.border     = '1px solid rgba(245,166,35,0.3)';
    elResult.innerHTML = `⚠️ Fator R < 28% — use <strong>Anexo V</strong>. Para migrar ao Anexo III, o pró-labore precisaria ser ≥ ${fmt(receita * FATOR_R_MINIMO)}/mês.`;
  }
}


// ============================================================
// 7. ORQUESTRAÇÃO — CENÁRIO ATUAL (ABA 1)
// ============================================================

let chartAtual   = null;
let chartReforma = null;

/**
 * Lê o formulário, executa os cálculos e atualiza a interface.
 */
function calcularCenarioAtual() {
  const receita       = parseFloat(document.getElementById('receita').value) || 0;
  const despesas      = parseFloat(document.getElementById('despesas').value) || 0;
  // PF autônomo = sempre serviço. ISS obrigatório.
  const issAliq       = (parseFloat(document.getElementById('iss').value) || 5) / 100;
  const anexo         = document.getElementById('anexo').value;
  const temProLabore  = document.getElementById('temProLabore').checked;
  const prolabore     = parseFloat(document.getElementById('prolabore').value) || SALARIO_MINIMO_2026;
  const custoContabil = parseFloat(document.getElementById('contabilidade').value) || 350;

  if (receita <= 0) {
    alert('Informe uma receita mensal válida.');
    document.getElementById('receita').focus();
    return;
  }

  // Validar pró-labore mínimo
  if (temProLabore && prolabore < SALARIO_MINIMO_2026) {
    alert(`O pró-labore mínimo é R$ ${fmt(SALARIO_MINIMO_2026)} (salário mínimo 2026). Ajuste o valor.`);
    document.getElementById('prolabore').value = SALARIO_MINIMO_2026;
    document.getElementById('prolabore').focus();
    return;
  }

  // Cálculos
  const pf = calcularPF(receita, despesas, issAliq);
  const pj = calcularPJAtual(receita, anexo, temProLabore, prolabore, custoContabil);

  // Preencher cards
  preencherCardPF(pf, receita, issAliq);
  preencherCardPJ(pj, receita, anexo);
  preencherCardDiff(pf, pj);

  // Destaque vencedor/perdedor
  definirVencedor(pf, pj);

  // Exibir resultados
  document.getElementById('resultsGrid').style.display = 'grid';

  // Ponto de virada
  const pv = calcularPontoVirada(anexo, temProLabore, prolabore, custoContabil, issAliq);
  exibirPontoVirada(pv, receita);

  // Gráfico comparativo
  const dadosGrafico = gerarDadosGrafico(anexo, temProLabore, prolabore, custoContabil, issAliq);
  renderizarGrafico(dadosGrafico);

  // CTA
  document.getElementById('ctaCard').style.display = 'flex';

  document.getElementById('resultsGrid').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Preenche o card PF com valores e detalhes de cálculo.
 */
function preencherCardPF(pf, receita, issAliq) {
  document.getElementById('pf-inss').textContent    = fmt(pf.inss);
  document.getElementById('pf-iss').textContent     = fmt(pf.iss);
  document.getElementById('pf-irpf').textContent    = fmt(pf.irpf);
  document.getElementById('pf-total').textContent   = fmt(pf.total);
  document.getElementById('pf-liquido').textContent = fmt(pf.liquido);
  document.getElementById('pf-pct').textContent     = pf.percentual.toFixed(1) + '%';

  // Atualizar detalhe do ISS com alíquota real
  const issDetailEl = document.getElementById('pf-iss-detail');
  if (issDetailEl) issDetailEl.textContent = `(${(issAliq * 100).toFixed(1)}% s/ receita)`;
}

/**
 * Preenche o card PJ com valores e detalhes de cálculo.
 */
function preencherCardPJ(pj, receita, anexo) {
  document.getElementById('pj-das').textContent     = fmt(pj.das);
  document.getElementById('pj-inss').textContent    = fmt(pj.inssProLabore);
  document.getElementById('pj-contabil').textContent= fmt(pj.custoContabil);
  document.getElementById('pj-total').textContent   = fmt(pj.total);
  document.getElementById('pj-liquido').textContent = fmt(pj.liquido);
  document.getElementById('pj-pct').textContent     = pj.percentual.toFixed(1) + '%';

  // Detalhar alíquota efetiva do DAS
  const dasDetailEl = document.getElementById('pj-das-detail');
  if (dasDetailEl) {
    dasDetailEl.textContent = `(alíq. efetiva ${(pj.aliquotaEfetiva * 100).toFixed(2)}% s/ receita)`;
  }

  // Atualizar sublabel do card
  const subEl = document.getElementById('pj-card-sub');
  if (subEl) subEl.textContent = `Simples Nacional · Anexo ${anexo}`;
}

/**
 * Preenche o card de diferença.
 */
function preencherCardDiff(pf, pj) {
  const diff      = pf.total - pj.total;   // positivo = PJ mais barata
  const diffAnual = diff * 12;

  const elMensal = document.getElementById('diff-mensal');
  const elAnual  = document.getElementById('diff-anual');
  const elMsg    = document.getElementById('diff-msg');

  elMensal.textContent = fmt(Math.abs(diff));
  elAnual.textContent  = fmt(Math.abs(diffAnual));

  if (diff > 0) {
    elMensal.className = 'mono diff-val text-green';
    elAnual.className  = 'mono diff-val-big text-green';
    elMsg.className    = 'diff-msg bg-green';
    elMsg.textContent  = `✅ Abrir CNPJ economiza ${fmt(Math.abs(diff))}/mês · ${fmt(Math.abs(diffAnual))}/ano`;
  } else if (diff < 0) {
    elMensal.className = 'mono diff-val text-red';
    elAnual.className  = 'mono diff-val-big text-red';
    elMsg.className    = 'diff-msg bg-red';
    elMsg.textContent  = `⚠️ Permanecer como autônomo (PF) economiza ${fmt(Math.abs(diff))}/mês · ${fmt(Math.abs(diffAnual))}/ano`;
  } else {
    elMensal.className = 'mono diff-val';
    elAnual.className  = 'mono diff-val-big';
    elMsg.className    = 'diff-msg';
    elMsg.textContent  = '⚖️ PF e PJ têm carga equivalente nesta faixa de receita.';
  }
}

/**
 * Aplica destaque visual ao vencedor e perdedor.
 */
function definirVencedor(pf, pj) {
  const cPF = document.getElementById('cardPF');
  const cPJ = document.getElementById('cardPJ');
  const vPF = document.getElementById('pf-verdict');
  const vPJ = document.getElementById('pj-verdict');

  cPF.classList.remove('card-winner', 'card-loser');
  cPJ.classList.remove('card-winner', 'card-loser');

  if (pf.total <= pj.total) {
    cPF.classList.add('card-winner');
    cPJ.classList.add('card-loser');
    vPF.textContent = '🏆 MELHOR OPÇÃO';   vPF.style.color = 'var(--green)';
    vPJ.textContent = '↑ Carga maior';      vPJ.style.color = 'var(--red)';
  } else {
    cPJ.classList.add('card-winner');
    cPF.classList.add('card-loser');
    vPJ.textContent = '🏆 MELHOR OPÇÃO';   vPJ.style.color = 'var(--green)';
    vPF.textContent = '↑ Carga maior';      vPF.style.color = 'var(--red)';
  }
}

/**
 * Exibe o card do ponto de virada com a mensagem adequada.
 */
function exibirPontoVirada(pv, receitaAtual) {
  const card = document.getElementById('pontoViradaCard');
  const msg  = document.getElementById('pv-mensagem');
  card.style.display = 'flex';

  if (pv === null) {
    msg.innerHTML = 'Nesta configuração, a <strong>Pessoa Física</strong> é mais vantajosa em todas as faixas de receita simuladas.';
    return;
  }

  const pvArr = Math.round(pv / 100) * 100;

  if (receitaAtual >= pvArr) {
    msg.innerHTML = `Com receita de <span class="highlight">${fmt(receitaAtual)}/mês</span>, você já ultrapassou o ponto de virada de <span class="highlight">${fmt(pvArr)}/mês</span>. Abrir CNPJ é a estratégia mais vantajosa. 🚀`;
  } else {
    msg.innerHTML = `A partir de <span class="highlight">${fmt(pvArr)}/mês</span> o CNPJ passa a ser mais vantajoso. Sua receita atual é <span class="highlight">${fmt(receitaAtual)}/mês</span>.`;
  }
}


// ============================================================
// 8. ORQUESTRAÇÃO — REFORMA TRIBUTÁRIA (ABA 2)
// ============================================================

function calcularCenarioReforma() {
  const receita       = parseFloat(document.getElementById('receita').value) || 0;
  const despesas      = parseFloat(document.getElementById('despesas').value) || 0;
  const issAliq       = (parseFloat(document.getElementById('iss').value) || 5) / 100;
  const temProLabore  = document.getElementById('temProLabore').checked;
  const prolabore     = parseFloat(document.getElementById('prolabore').value) || SALARIO_MINIMO_2026;
  const custoContabil = parseFloat(document.getElementById('contabilidade').value) || 350;
  const aliqReforma   = (parseFloat(document.getElementById('aliquotaReforma').value) || 26.5) / 100;

  if (receita <= 0) {
    alert('Preencha a receita mensal na aba "Cenário Atual" antes de simular a reforma.');
    ativarTab('atual');
    document.getElementById('receita').focus();
    return;
  }

  const pf        = calcularPF(receita, despesas, issAliq);
  const pjReforma = calcularPJReforma(receita, aliqReforma, temProLabore, prolabore, custoContabil);

  const anexo   = document.getElementById('anexo').value;
  const pjAtual = calcularPJAtual(receita, anexo, temProLabore, prolabore, custoContabil);

  // Preencher card PF reforma (ISS e IRPF mantidos durante transição até 2033)
  document.getElementById('pfr-inss').textContent    = fmt(pf.inss);
  document.getElementById('pfr-iss').textContent     = fmt(pf.iss);
  document.getElementById('pfr-irpf').textContent    = fmt(pf.irpf);
  document.getElementById('pfr-total').textContent   = fmt(pf.total);
  document.getElementById('pfr-liquido').textContent = fmt(pf.liquido);

  // Preencher card PJ reforma
  document.getElementById('pjr-ibs').textContent      = fmt(pjReforma.ibsCbs);
  document.getElementById('pjr-inss').textContent     = fmt(pjReforma.inssProLabore);
  document.getElementById('pjr-contabil').textContent = fmt(pjReforma.custoContabil);
  document.getElementById('pjr-total').textContent    = fmt(pjReforma.total);
  document.getElementById('pjr-liquido').textContent  = fmt(pjReforma.liquido);

  // Atualizar detalhe IBS+CBS
  const ibsDetailEl = document.getElementById('pjr-ibs-detail');
  if (ibsDetailEl) ibsDetailEl.textContent = `(${(aliqReforma * 100).toFixed(1)}% s/ receita)`;

  // Alertas de impacto
  const difPJ  = pjReforma.total - pjAtual.total;
  const elPJ   = document.getElementById('alertaPJ');
  const elPF   = document.getElementById('alertaPF');
  const elMsg  = document.getElementById('alertaMsgReforma');

  if (difPJ > 100) {
    elPJ.innerHTML  = `📈 <strong>PJ — Reforma aumenta o custo em ${fmt(difPJ)}/mês (${fmt(difPJ * 12)}/ano)</strong>`;
    elPJ.style.color = 'var(--red)';
  } else if (difPJ < -100) {
    elPJ.innerHTML  = `📉 <strong>PJ — Reforma reduz o custo em ${fmt(Math.abs(difPJ))}/mês (${fmt(Math.abs(difPJ) * 12)}/ano)</strong>`;
    elPJ.style.color = 'var(--green)';
  } else {
    elPJ.innerHTML  = '⚖️ <strong>PJ — Impacto da reforma é pequeno nesta faixa.</strong>';
    elPJ.style.color = 'var(--text-muted)';
  }

  elPF.innerHTML  = `ℹ️ <strong>PF — Sem alteração relevante no curto prazo.</strong> ISS e IRPF se mantêm durante a transição (período estimado até 2033, conforme EC 132/2023).`;
  elPF.style.color = 'var(--text-muted)';

  const melhor = pjReforma.total < pf.total ? 'PJ' : 'PF';
  elMsg.innerHTML = `⚠️ <strong>ATENÇÃO:</strong> Com IBS+CBS à alíquota estimada de ${(aliqReforma * 100).toFixed(1)}%, a carga mensal da PJ passa a ser ${fmt(pjReforma.total)}. A opção mais vantajosa neste cenário é <strong>${melhor}</strong>.`;

  document.getElementById('resultsGridReforma').style.display = 'grid';

  const dadosRef = gerarDadosGraficoReforma(anexo, temProLabore, prolabore, custoContabil, issAliq, aliqReforma);
  renderizarGraficoReforma(dadosRef);

  document.getElementById('resultsGridReforma').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}


// ============================================================
// 9. DADOS PARA GRÁFICOS
// ============================================================

const FAIXAS = Array.from({ length: 30 }, (_, i) => (i + 1) * 1000);

function gerarDadosGrafico(anexo, temPL, prolabore, custoContabil, issAliq) {
  const labels = FAIXAS.map(v => 'R$' + (v / 1000) + 'k');
  const totalPF = [];
  const totalPJ = [];

  FAIXAS.forEach(r => {
    totalPF.push(+calcularPF(r, 0, issAliq).total.toFixed(2));
    totalPJ.push(+calcularPJAtual(r, anexo, temPL, prolabore, custoContabil).total.toFixed(2));
  });

  return { labels, totalPF, totalPJ };
}

function gerarDadosGraficoReforma(anexo, temPL, prolabore, custoContabil, issAliq, aliqReforma) {
  const labels     = FAIXAS.map(v => 'R$' + (v / 1000) + 'k');
  const totalPF    = [];
  const totalPJAt  = [];
  const totalPJRef = [];

  FAIXAS.forEach(r => {
    totalPF.push(+calcularPF(r, 0, issAliq).total.toFixed(2));
    totalPJAt.push(+calcularPJAtual(r, anexo, temPL, prolabore, custoContabil).total.toFixed(2));
    totalPJRef.push(+calcularPJReforma(r, aliqReforma, temPL, prolabore, custoContabil).total.toFixed(2));
  });

  return { labels, totalPF, totalPJAtual: totalPJAt, totalPJRef };
}


// ============================================================
// 10. GRÁFICOS (Chart.js)
// ============================================================

function renderizarGrafico({ labels, totalPF, totalPJ }) {
  const ctx = document.getElementById('graficoComparativo').getContext('2d');
  if (chartAtual) { chartAtual.destroy(); chartAtual = null; }

  chartAtual = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Pessoa Física (Autônomo)',
          data: totalPF,
          borderColor: '#e84545',
          backgroundColor: 'rgba(232,69,69,0.07)',
          borderWidth: 2.5,
          pointRadius: 2,
          pointHoverRadius: 5,
          tension: 0.4,
          fill: true
        },
        {
          label: 'PJ — Simples Nacional',
          data: totalPJ,
          borderColor: '#7ed957',
          backgroundColor: 'rgba(126,217,87,0.07)',
          borderWidth: 2.5,
          pointRadius: 2,
          pointHoverRadius: 5,
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: getChartOptions()
  });

  document.getElementById('chartCard').style.display = 'block';
}

function renderizarGraficoReforma({ labels, totalPF, totalPJAtual, totalPJRef }) {
  const ctx = document.getElementById('graficoReforma').getContext('2d');
  if (chartReforma) { chartReforma.destroy(); chartReforma = null; }

  chartReforma = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'PF (Autônomo)',
          data: totalPF,
          borderColor: '#e84545',
          backgroundColor: 'rgba(232,69,69,0.06)',
          borderWidth: 2,
          pointRadius: 2,
          tension: 0.4,
          fill: true
        },
        {
          label: 'PJ — Simples Atual',
          data: totalPJAtual,
          borderColor: '#7ed957',
          backgroundColor: 'rgba(126,217,87,0.06)',
          borderWidth: 2,
          pointRadius: 2,
          tension: 0.4,
          fill: true
        },
        {
          label: 'PJ — Pós-Reforma (IBS+CBS)',
          data: totalPJRef,
          borderColor: '#a78bfa',
          backgroundColor: 'rgba(167,139,250,0.06)',
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 2,
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: getChartOptions()
  });

  document.getElementById('chartCardReforma').style.display = 'block';
}

/** Retorna as opções do Chart.js adaptadas ao tema atual */
function getChartOptions() {
  const isDark   = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor  = isDark ? '#888' : '#5c7080';
  const gridColor  = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const tooltipBg  = isDark ? '#1a1a1a' : '#fff';
  const tooltipBdr = isDark ? '#2a2a2a' : '#dde4ea';

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { family: "'Sora', sans-serif", size: 11 },
          color: textColor,
          usePointStyle: true,
          padding: 18
        }
      },
      tooltip: {
        backgroundColor: tooltipBg,
        borderColor: tooltipBdr,
        borderWidth: 1,
        titleColor: isDark ? '#f0f0f0' : '#1a2732',
        bodyColor: textColor,
        callbacks: {
          label: ctx => ` ${ctx.dataset.label}: ${fmt(parseFloat(ctx.raw))}`
        }
      }
    },
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: { font: { family: "'DM Mono', monospace", size: 9 }, color: textColor, maxRotation: 45 }
      },
      y: {
        grid: { color: gridColor },
        ticks: {
          font: { family: "'DM Mono', monospace", size: 9 },
          color: textColor,
          callback: v => 'R$' + Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })
        }
      }
    }
  };
}


// ============================================================
// 11. TOGGLE TEMA ESCURO/CLARO
// ============================================================

/**
 * Alterna entre tema escuro e claro.
 * Também troca a logo: branca (dark) ↔ azul (light).
 */
function toggleTheme() {
  const html = document.documentElement;
  const atual = html.getAttribute('data-theme');
  const novo  = atual === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', novo);

  // Trocar todas as logos da página
  trocarLogos(novo);

  // Salvar preferência
  try { localStorage.setItem('tema-simulador', novo); } catch(e) {}

  // Recriar gráficos com as novas cores
  if (chartAtual || chartReforma) {
    setTimeout(() => {
      if (chartAtual) { chartAtual.options = getChartOptions(); chartAtual.update(); }
      if (chartReforma){ chartReforma.options = getChartOptions(); chartReforma.update(); }
    }, 50);
  }
}

/**
 * Troca o src de todas as logos conforme o tema.
 * dark  → exito-logo-branco.png
 * light → exito-logo-azul.png
 */
/**
 * Troca logos conforme tema:
 * - Header:  sempre BRANCA (bg sempre teal/escuro)
 * - CTA:     sempre BRANCA (bg teal #1a5068 em ambos os temas)
 * - Modal:   AZUL no claro (bg branco), BRANCA no escuro
 * - Footer:  AZUL no claro (bg claro), BRANCA no escuro
 */
function trocarLogos(tema) {
  // Header e CTA: sempre branca (fundos escuros/teal)
  document.querySelectorAll('.header-logo, .cta-logo').forEach(img => {
    img.src = 'assets/exito-logo-branco.png';
  });

  // Modal e footer: azul no claro, branca no escuro
  const srcAlt = tema === 'light' ? 'assets/exito-logo-azul.png' : 'assets/exito-logo-branco.png';
  document.querySelectorAll('.modal-logo, .footer-logo').forEach(img => {
    img.src = srcAlt;
  });
}

/** Restaura o tema salvo e aplica a logo correta */
function restaurarTema() {
  try {
    const salvo = localStorage.getItem('tema-simulador');
    if (salvo) {
      document.documentElement.setAttribute('data-theme', salvo);
      // Trocar logos após DOM estar pronto
      document.addEventListener('DOMContentLoaded', () => trocarLogos(salvo), { once: true });
    }
  } catch(e) {}
}


// ============================================================
// 12. CONTROLE DAS ABAS
// ============================================================

function ativarTab(id) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const ativo = btn.dataset.tab === id;
    btn.classList.toggle('active', ativo);
    btn.setAttribute('aria-selected', String(ativo));
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${id}`);
  });
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => ativarTab(btn.dataset.tab));
});


// ============================================================
// 13. MODAL
// ============================================================

function abrirModalCNPJ() {
  // Atualiza o link do WhatsApp dinamicamente com o número configurado no topo do arquivo
  const link = document.querySelector('.btn-whatsapp');
  if (link) {
    link.href = `https://wa.me/${WA_NUMERO}?text=${encodeURIComponent(WA_MENSAGEM)}`;
  }
  document.getElementById('modalCNPJ').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function fecharModalDireto() {
  document.getElementById('modalCNPJ').style.display = 'none';
  document.body.style.overflow = '';
}

function fecharModal(e) {
  if (e.target === document.getElementById('modalCNPJ')) fecharModalDireto();
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharModalDireto(); });


// ============================================================
// 14. TOGGLE PRÓ-LABORE
// ============================================================

document.getElementById('temProLabore').addEventListener('change', function () {
  document.getElementById('prolaboreField').style.display = this.checked ? 'block' : 'none';
  atualizarFatorR();
});

// Atualizar Fator R quando campos mudam
['receita', 'prolabore'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', atualizarFatorR);
});

document.getElementById('anexo').addEventListener('change', atualizarFatorR);


// ============================================================
// 15. FORMATAÇÃO
// ============================================================

function fmt(valor) {
  if (isNaN(valor) || valor === null || valor === undefined) return 'R$ 0,00';
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}


// ============================================================
// 16. INICIALIZAÇÃO
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // Restaurar tema salvo
  restaurarTema();

  // Estado inicial pró-labore
  const check = document.getElementById('temProLabore');
  document.getElementById('prolaboreField').style.display = check.checked ? 'block' : 'none';

  // Valor padrão atualizado para 2026
  const prolaboreInput = document.getElementById('prolabore');
  if (prolaboreInput) {
    prolaboreInput.value = SALARIO_MINIMO_2026;
    prolaboreInput.min   = SALARIO_MINIMO_2026;
  }

  // Fator R inicial
  atualizarFatorR();

  // Foco no campo de receita
  document.getElementById('receita').focus();

  // WhatsApp configurado em WA_NUMERO no topo deste arquivo
  // Garantir logo correta no estado inicial
  const temaAtual = document.documentElement.getAttribute('data-theme') || 'dark';
  trocarLogos(temaAtual);

  console.log('%c Êxito Contábil · Simulador Tributário v2.0 · 2026 ', 'background:#0d0d0d;color:#7ed957;font-weight:bold;padding:4px 10px;border-radius:4px;border:1px solid #7ed957');
  console.log('%c ✅ WhatsApp configurado: +' + WA_NUMERO + ' ', 'color:#7ed957');
  console.log('Salário mínimo 2026: R$', SALARIO_MINIMO_2026);
  console.log('Fator R mínimo para Anexo III:', (FATOR_R_MINIMO * 100) + '%');
});
