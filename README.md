# 📊 Simulador Tributário PF vs PJ

> **Êxito Contábil** · CRC 011005/O-3 PB · João Pessoa — PB

Ferramenta web para comparação tributária entre **Pessoa Física (Autônomo)** e **Pessoa Jurídica (Simples Nacional)**, com simulação do impacto da **Reforma Tributária (EC 132/2023)**. Desenvolvida para uso profissional e orientação de clientes contábeis.

---

## 🖥️ Demo

> Abra `index.html` diretamente no navegador — nenhum servidor necessário.

**Repositório:** `fhms1.github.io/simulador-tributario` *(após publicação)*

---

## ✨ Funcionalidades

### Aba 1 — Cenário Atual
- Cálculo completo de impostos para **Pessoa Física (Autônomo)**
  - INSS: 20% sobre a renda até o teto (R$ 7.786,02)
  - ISS: alíquota configurável (padrão 5%)
  - IRPF: tabela progressiva 2026 com isenção MP 1.294/2024 até R$ 2.824,00
- Cálculo completo para **Pessoa Jurídica (Simples Nacional)**
  - DAS: fórmula oficial de alíquota efetiva via RBT12 estimada
  - Anexo III (serviços gerais) ou Anexo V (profissões regulamentadas)
  - INSS sobre pró-labore (11%)
  - Custo de contabilidade mensal configurável
- **Cards comparativos** com destaque visual: vencedor (verde) e mais oneroso (vermelho)
- **Diferença mensal e anual** entre PF e PJ
- **Ponto de virada** — calcula automaticamente a receita a partir da qual abrir CNPJ é vantajoso (busca binária com precisão de R$ 10)
- **Gráfico comparativo** PF × PJ de R$ 1.000 a R$ 30.000/mês (Chart.js)

### Aba 2 — Reforma Tributária
- Simulação com **IBS + CBS** substituindo PIS, COFINS, ISS e ICMS
- Alíquota configurável (padrão 26,5% — projeção oficial)
- **Alerta de impacto**: diferença de custo entre o cenário atual e pós-reforma
- Gráfico comparativo: PJ Atual × PJ Pós-Reforma × PF

### Extras
- **CTA "Quero abrir meu CNPJ"** com modal e link direto para WhatsApp
- Logo Êxito Contábil no header, modal e footer
- Design responsivo — funciona em mobile e desktop
- Tema escuro (`#0d0d0d`) com identidade visual da marca

---

## 🗂️ Estrutura de Arquivos

```
simulador-tributario/
├── index.html              # Estrutura HTML — abas, formulário, cards, modal
├── style.css               # Estilos — tema escuro, design system, responsivo
├── script.js               # Lógica tributária e interações
└── exito-logo-branco.png   # Logo Êxito Contábil (branca, fundo transparente)
```

---

## ⚙️ Como Usar

### Rodar localmente

1. Baixe ou clone os arquivos na mesma pasta
2. Abra `index.html` no navegador (Chrome, Firefox, Edge, Safari)
3. Não requer instalação, servidor ou dependências locais

### Publicar no GitHub Pages

```bash
# 1. Crie um repositório no GitHub
# 2. Envie os arquivos
git init
git add .
git commit -m "feat: simulador tributário PF vs PJ"
git remote add origin https://github.com/fhms1/simulador-tributario.git
git push -u origin main

# 3. Ative GitHub Pages em Settings → Pages → Branch: main
```

A aplicação estará disponível em:
`https://fhms1.github.io/simulador-tributario/`

---

## 🧮 Lógica Tributária

### Pessoa Física — Autônomo

| Tributo | Base de Cálculo | Alíquota |
|---------|----------------|----------|
| INSS | Receita bruta (limitada ao teto R$ 7.786,02) | 20% |
| ISS | Receita bruta | Configurável (2% a 5%) |
| IRPF | Receita − INSS − Dedução Simplificada (20%, máx. R$ 1.396,19/mês) − Despesas | Tabela progressiva 2026 |

**Tabela IRPF 2026 (MP 1.294/2024)**

| Base de Cálculo | Alíquota | Parcela a Deduzir |
|----------------|----------|-------------------|
| Até R$ 2.824,00 | Isento | — |
| R$ 2.824,01 a R$ 3.751,05 | 7,5% | R$ 211,80 |
| R$ 3.751,06 a R$ 4.664,68 | 15% | R$ 492,97 |
| R$ 4.664,69 a R$ 6.101,06 | 22,5% | R$ 841,97 |
| Acima de R$ 6.101,06 | 27,5% | R$ 1.147,26 |

### Pessoa Jurídica — Simples Nacional

**Fórmula da alíquota efetiva:**

```
Alíquota Efetiva = (RBT12 × Alíquota Nominal − Parcela a Deduzir) ÷ RBT12
DAS = Receita Mensal × Alíquota Efetiva
```

**Anexo III — Serviços Gerais**

| RBT12 | Alíq. Nominal | Parcela Dedutível |
|-------|--------------|-------------------|
| Até R$ 180.000 | 6,00% | — |
| Até R$ 360.000 | 11,20% | R$ 9.360,00 |
| Até R$ 720.000 | 13,50% | R$ 17.640,00 |
| Até R$ 1.800.000 | 16,00% | R$ 35.640,00 |
| Até R$ 3.600.000 | 21,00% | R$ 125.640,00 |
| Até R$ 4.800.000 | 33,00% | R$ 648.000,00 |

**Anexo V — Profissões Regulamentadas**

| RBT12 | Alíq. Nominal | Parcela Dedutível |
|-------|--------------|-------------------|
| Até R$ 180.000 | 15,50% | — |
| Até R$ 360.000 | 18,00% | R$ 4.500,00 |
| Até R$ 720.000 | 19,50% | R$ 9.900,00 |
| Até R$ 1.800.000 | 20,50% | R$ 17.100,00 |
| Até R$ 3.600.000 | 23,00% | R$ 62.100,00 |
| Até R$ 4.800.000 | 30,50% | R$ 540.000,00 |

### Reforma Tributária

```
IBS + CBS = Receita Mensal × Alíquota Estimada (padrão 26,5%)
Custo PJ Reforma = IBS+CBS + INSS Pró-labore + Contabilidade
```

> ⚠️ As alíquotas da Reforma Tributária são estimativas — os valores definitivos ainda estão sendo regulamentados pelo Comitê Gestor do IBS.

---

## 📐 Arquitetura do Código

```
script.js
│
├── CONSTANTES
│   ├── TABELA_IRPF[]          — faixas progressivas 2026
│   ├── SIMPLES_ANEXO_III[]    — tabela Anexo III
│   ├── SIMPLES_ANEXO_V[]      — tabela Anexo V
│   └── TETO_INSS, SALARIO_MINIMO
│
├── CÁLCULOS TRIBUTÁRIOS
│   ├── calcularPF()           — INSS + ISS + IRPF (autônomo)
│   ├── calcularIRPF()         — tabela progressiva
│   ├── calcularDAS()          — alíquota efetiva Simples Nacional
│   ├── calcularPJAtual()      — DAS + INSS pró-labore + contabilidade
│   └── calcularPJReforma()    — IBS+CBS + INSS + contabilidade
│
├── ANÁLISE
│   └── calcularPontoVirada()  — busca binária R$500 a R$100.000
│
├── ORQUESTRAÇÃO
│   ├── calcularCenarioAtual() — Aba 1: lê inputs, calcula, atualiza DOM
│   └── calcularCenarioReforma() — Aba 2: reforma tributária
│
├── GRÁFICOS (Chart.js)
│   ├── renderizarGrafico()      — PF × PJ atual
│   └── renderizarGraficoReforma() — PF × PJ atual × PJ reforma
│
└── UI / HELPERS
    ├── ativarTab()            — navegação entre abas
    ├── abrirModalCNPJ()       — modal CTA
    └── fmt()                  — formatação BRL
```

---

## 🎨 Design System

| Token | Valor | Uso |
|-------|-------|-----|
| `--bg` | `#0d0d0d` | Fundo principal |
| `--surface` | `#141414` | Cards e painéis |
| `--green` | `#7ed957` | Destaque, CTAs, vencedor |
| `--red` | `#e84545` | Alertas, perdedor |
| `--amber` | `#f5a623` | Avisos reforma |
| `--font` | Sora | Textos e interface |
| `--mono` | DM Mono | Valores numéricos |

---

## 📦 Dependências Externas

| Biblioteca | Versão | CDN | Uso |
|------------|--------|-----|-----|
| [Chart.js](https://www.chartjs.org/) | 4.4.0 | jsdelivr.net | Gráficos comparativos |
| [Google Fonts](https://fonts.google.com/) | — | fonts.googleapis.com | Sora + DM Mono |

> Nenhuma dependência local — tudo via CDN. Requer conexão com internet para carregar fontes e gráficos.

---

## ⚠️ Aviso Legal

Esta ferramenta é uma **estimativa para fins informativos**. Os valores calculados são aproximações baseadas na legislação vigente e não substituem a análise de um contador habilitado. Não considera:

- Deduções por dependentes, pensão alimentícia ou previdência privada
- Horas extras, adicional noturno ou variações de folha
- Convenções coletivas de trabalho
- Fatores específicos do CNAE na apuração do FAP/RAT
- Histórico real de RBT12 para o Simples Nacional

---

## 📋 Base Legal

| Legislação | Descrição |
|-----------|-----------|
| Lei nº 8.212/1991, Art. 21 | INSS contribuinte individual — 20% |
| Lei Complementar nº 123/2006 | Simples Nacional e faixas de tributação |
| RIR/2018 (Decreto 9.580) | Regulamento do Imposto de Renda |
| MP nº 1.294/2024 | Isenção IRPF até R$ 5.000 / tabela 2026 |
| EC 132/2023 | Reforma Tributária — IBS e CBS |
| Lei nº 12.506/2011 | Aviso prévio proporcional |

---

## 🔮 Roadmap

- [ ] Exportação dos resultados em PDF (html2pdf.js)
- [ ] Comparativo com **Lucro Presumido**
- [ ] Simulação de MEI
- [ ] Modo de múltiplos sócios (divisão de pró-labore)
- [ ] Integração com backend para salvar simulações
- [ ] Unificação com o ecossistema `scmo-clt` e `rescisao-clt` em portal único

---

## 👨‍💻 Autor

**Fabio Henrique de Moura Silva**  
CRC 011005/O-3 PB · CEO — Êxito Contábil  
[fhms1.github.io](https://fhms1.github.io) · João Pessoa, PB

---

## 📄 Licença

Uso exclusivo da **Êxito Contábil**. Proibida reprodução ou redistribuição sem autorização.

---

<div align="center">
  <sub>Êxito Contábil · Simulador Tributário v1.0 · 2026</sub>
</div>
