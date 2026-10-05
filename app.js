import {
  SAATY, pairs, pairKey, pairValue, setPairValue, fuzzyPairValue, setFuzzyPairValue,
  approximateTriangle, comparisonProgress, comparisonMatrix,
  ahpAnalysis, anpAnalysis, networkStatus, evaluationStatus, principalEigenvector, consistency,
  normalizedEvaluations, rankAlternatives, sensitivity,
} from "./math.js";

const root = document.querySelector("#app");
const STORE = "decisionlab.v2.projects";
const iconPaths = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-7h6v7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  nodes: '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="7" r="2"/><circle cx="12" cy="19" r="2"/><path d="m7 5 10 2M6 7l5 10m7-8-5 8"/>',
  compare: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor" stroke="none"/><circle cx="16" cy="17" r="3" fill="currentColor" stroke="none"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10M15 10v10"/>',
  chart: '<path d="M4 20V4m0 16h17"/><path d="m7 16 5-5 3 2 5-7"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  back: '<path d="M19 12H5m6-6-6 6 6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4"/><path d="M4 17v3h16v-3"/>',
  upload: '<path d="M12 21V9m-4 4 4-4 4 4"/><path d="M4 7V4h16v3"/>',
  trash: '<path d="M4 7h16m-10-3h4m-8 3 1 14h10l1-14M10 11v6m4-6v6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
  sparkle: '<path d="m12 2 2 7 7 3-7 2-2 8-2-8-7-2 7-3z"/>',
};
function icon(name) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (iconPaths[name] || iconPaths.info) + '</svg>';
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function uid() {
  return globalThis.crypto?.randomUUID?.() || "id-" + Date.now() + "-" + Math.random().toString(36).slice(2);
}
function load() {
  try {
    const projects = JSON.parse(localStorage.getItem(STORE) || "[]");
    return Array.isArray(projects) ? projects : [];
  } catch { return []; }
}
const state = { projects: load(), projectId: null, view: "home", target: null, judgmentIndex: 0, fuzzyCustomFor: null, toast: "" };
function project() { return state.projects.find(item => item.id === state.projectId); }
function save() {
  const active = project();
  if (active) active.updatedAt = new Date().toISOString();
  try { localStorage.setItem(STORE, JSON.stringify(state.projects)); }
  catch { toast("Não foi possível salvar no navegador. Exporte o JSON da análise."); }
}
function toast(message) {
  state.toast = message;
  const old = document.querySelector(".toast");
  if (old) old.remove();
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.append(node);
  setTimeout(() => { if (node.isConnected) node.remove(); }, 4200);
}
function defaultProject() {
  const now = new Date().toISOString();
  return {
    id: uid(), title: "Nova análise", objective: "", createdAt: now, updatedAt: now,
    method: "ahp", evaluationMode: "score",
    criteria: [], alternatives: [], influences: {},
    comparisons: { base: {}, influence: {}, fuzzyBase: {}, fuzzyInfluence: {} }, evaluations: {},
  };
}
const EXAMPLES = [
  {
    key: "celular-universitario-v1", category: "01 / TECNOLOGIA", title: "Qual celular comprar?",
    description: "Equilibre preço, bateria e câmera na rotina universitária.", method: "ahp",
    objective: "Escolher um celular para a rotina universitária equilibrando preço, autonomia de bateria e qualidade da câmera.",
    criteria: [
      { id: "preco", name: "Preço", type: "cost", unit: "R$" },
      { id: "bateria", name: "Bateria", type: "benefit", unit: "horas" },
      { id: "camera", name: "Câmera", type: "benefit", unit: "nota 0–10" },
    ],
    alternatives: [
      { id: "lume", name: "Lume Lite" },
      { id: "nexo", name: "Nexo Plus" },
      { id: "prisma", name: "Prisma Pro" },
    ],
    evaluations: {
      lume: { preco: 1800, bateria: 18, camera: 7 },
      nexo: { preco: 2600, bateria: 24, camera: 8 },
      prisma: { preco: 3800, bateria: 20, camera: 10 },
    },
  },
  {
    key: "fornecedor-universitario-v1", category: "02 / PROJETO", title: "Qual fornecedor escolher?",
    description: "Compare propostas para um evento estudantil por custo, qualidade e prazo.", method: "ahp",
    objective: "Selecionar um fornecedor para um evento universitário equilibrando custo, qualidade e prazo de entrega.",
    criteria: [
      { id: "custo", name: "Custo", type: "cost", unit: "R$" },
      { id: "qualidade", name: "Qualidade", type: "benefit", unit: "nota 0–10" },
      { id: "prazo", name: "Prazo", type: "cost", unit: "dias" },
    ],
    alternatives: [
      { id: "atlas", name: "Atlas" },
      { id: "boreal", name: "Boreal" },
      { id: "cobalto", name: "Cobalto" },
    ],
    evaluations: {
      atlas: { custo: 1800, qualidade: 7, prazo: 15 },
      boreal: { custo: 2400, qualidade: 9, prazo: 10 },
      cobalto: { custo: 3000, qualidade: 8, prazo: 7 },
    },
  },
  {
    key: "moradia-universitaria-v1", category: "03 / VIDA UNIVERSITÁRIA", title: "Onde morar durante a faculdade?",
    description: "Explore uma rede ANP entre aluguel, deslocamento e infraestrutura.", method: "anp",
    objective: "Escolher uma moradia universitária considerando aluguel, tempo de deslocamento e infraestrutura.",
    criteria: [
      { id: "aluguel", name: "Aluguel", type: "cost", unit: "R$/mês" },
      { id: "deslocamento", name: "Deslocamento", type: "cost", unit: "minutos" },
      { id: "infraestrutura", name: "Infraestrutura", type: "benefit", unit: "nota 0–10" },
    ],
    alternatives: [
      { id: "campus", name: "Residência Campus" },
      { id: "centro", name: "Apartamento Centro" },
      { id: "jardim", name: "República Jardim" },
    ],
    evaluations: {
      campus: { aluguel: 1300, deslocamento: 10, infraestrutura: 6 },
      centro: { aluguel: 1800, deslocamento: 25, infraestrutura: 9 },
      jardim: { aluguel: 1000, deslocamento: 40, infraestrutura: 7 },
    },
  },
];
function demoProject(exampleKey = EXAMPLES[0].key) {
  const example = EXAMPLES.find(value => value.key === exampleKey) || EXAMPLES[0];
  const item = defaultProject();
  item.title = example.title;
  item.objective = example.objective;
  item.guided = true;
  item.exampleKey = example.key;
  item.method = example.method;
  item.evaluationMode = "raw";
  item.criteria = structuredClone(example.criteria);
  item.alternatives = structuredClone(example.alternatives);
  item.influences = Object.fromEntries(item.criteria.map(c => [c.id, item.criteria.map(x => x.id)]));
  item.evaluations = structuredClone(example.evaluations);
  return item;
}
function selectProject(id, view = "overview") {
  state.projectId = id;
  state.view = view;
  state.target = project()?.criteria[0]?.id || null;
  state.judgmentIndex = 0;
  state.fuzzyCustomFor = null;
  render();
}
function pct(value, digits = 0) { return (value * 100).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }) + "%"; }
function date(value) { return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }); }
function criterionName(item, id) { return item.criteria.find(c => c.id === id)?.name || "Critério removido"; }
function methodName(item) {
  if (item.method === "anp") {
    const fuzzyUsed = item.criteria.some(target => {
      const incoming = item.criteria.filter(c => (item.influences[target.id] || []).includes(c.id)).map(c => c.id);
      return pairs(incoming).some(([a, b]) => {
        const triangle = fuzzyPairValue(item.comparisons.fuzzyInfluence?.[target.id] || {}, a, b);
        const modal = pairValue(item.comparisons.influence?.[target.id] || {}, a, b);
        return triangle && modal !== null && closeNumber(triangle.m, modal) && triangle.l < triangle.u;
      });
    });
    return fuzzyUsed ? "ANP com julgamentos fuzzy" : "ANP em rede";
  }
  return pairs(item.criteria.map(c => c.id)).some(([a, b]) => {
    const triangle = fuzzyPairValue(item.comparisons.fuzzyBase || {}, a, b);
    const modal = pairValue(item.comparisons.base, a, b);
    return triangle && modal !== null && closeNumber(triangle.m, modal) && triangle.l < triangle.u;
  })
    ? "AHP fuzzy + pontuação" : "AHP + pontuação";
}
function analyses(item) {
  try {
    const model = item.method === "anp" ? anpAnalysis(item) : ahpAnalysis(item);
    const evaluation = evaluationStatus(item);
    const normalized = evaluation.ready ? normalizedEvaluations(item) : null;
    const ranking = model.ready && normalized ? rankAlternatives(item, model.weights, normalized) : null;
    return { model, evaluation, normalized, ranking };
  } catch (error) {
    return { model: { ready: false, reason: error.message }, evaluation: evaluationStatus(item), ranking: null };
  }
}
function shell(content) {
  const item = project();
  const nav = item ? [
    ["overview", "grid", "Problema", "Objetivo e opções"],
    ["structure", "nodes", "Modelo", "Critérios e relações"],
    ["judgments", "compare", "Julgamentos", "Comparações por pares"],
    ["evaluations", "table", "Desempenho", "Notas ou medidas"],
    ["results", "chart", "Interpretação", "Ranking e sensibilidade"],
  ] : [["home", "home", "Painel"]];
  const activeStage = nav.findIndex(([view]) => view === state.view);
  const analysis = item ? analyses(item) : null;
  const stageDone = item ? [Boolean(item.objective.trim()), item.criteria.length >= 2 && item.alternatives.length >= 2 && (item.method !== "anp" || networkStatus(item.criteria.map(c => c.id), item.influences).valid), analysis.model.ready, analysis.evaluation.ready, Boolean(analysis.ranking)] : [];
  return '<div class="app' + (item ? " analysis-shell" : "") + '"><aside class="sidebar">' +
    '<a class="brand" href="#" data-action="home" aria-label="DecisionLab, voltar ao painel"><span class="brand-name">decision<span>lab</span></span><span class="brand-dot" aria-hidden="true"></span></a>' +
    '<div class="journey-body">' + (item ? '<div class="journey-heading"><span class="nav-label">SEU PERCURSO</span><h2>Uma decisão<br>em 5 etapas.</h2><p>Avance e volte sempre que precisar.</p></div><button class="mobile-stage-toggle" type="button" data-action="toggle-nav" aria-expanded="false">Etapa ' + (activeStage + 1) + ' de 5 · ' + nav[activeStage][2] + ' <span>Ver etapas ⌄</span></button>' : '<div class="nav-label">NAVEGAÇÃO</div>') + '<nav class="side-nav" aria-label="Etapas da análise">' +
    nav.map(([view, symbol, name, subtitle], index) => '<button type="button" class="nav-item ' + (state.view === view ? "active" : "") + '" data-action="view" data-view="' + view + '"' + (state.view === view ? ' aria-current="step"' : "") + '>' + (item ? '<b class="nav-number">' + String(index + 1).padStart(2, "0") + '</b><span class="nav-copy"><strong>' + name + '</strong><small>' + subtitle + '</small></span><i aria-hidden="true">' + (index === activeStage ? "●" : stageDone[index] ? "✓" : "○") + '</i>' : icon(symbol) + '<span>' + name + '</span>') + '</button>').join("") +
    (item ? "" : '<button type="button" class="nav-item" data-action="new">' + icon("plus") + '<span>Nova análise</span></button>') +
    '</nav></div><div class="sidebar-bottom">' + (item ? '<button class="back-to-projects" type="button" data-action="home">← Todas as análises</button><p>' + (item.guided ? "Exemplo guiado. A pergunta deste caso é fixa; você pode experimentar julgamentos e desempenhos." : "Sua análise é salva neste navegador. Exporte um JSON para guardar uma cópia.") + '</p>' : "Seus projetos ficam neste navegador. Exporte um JSON para guardar uma cópia.") + '</div></aside>' +
    '<main class="main"><header class="topbar"><div class="topbar-left"><span class="crumb">' + (item ? "MINHAS ANÁLISES /" : "PLATAFORMA /") + '</span><span class="topbar-title">' + escapeHtml(item ? item.title : "Visão geral") + '</span></div><div class="topbar-right"><span class="saved">' + (item ? "● Salvo neste navegador" : "AHP · ANP") + '</span>' +
    (item ? '<button class="button secondary small-btn" data-action="export-json">' + icon("download") + ' Exportar</button>' : '<button class="button secondary small-btn" data-action="import">' + icon("upload") + ' Importar</button>') +
    '</div></header><div class="page' + (state.reportOpen ? ' report-active' : '') + '">' + content + '</div></main></div><input id="import-file" type="file" accept="application/json,.json" hidden>';
}
function home() {
  const recent = [...state.projects].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 4);
  const exampleStatus = example => {
    const saved = state.projects.filter(item => item.guided && item.exampleKey === example.key);
    return { unfinished: [...saved].reverse().find(item => !analyses(item).ranking), hasSaved: saved.length > 0 };
  };
  const phoneStatus = exampleStatus(EXAMPLES[0]);
  const phoneLabel = phoneStatus.unfinished ? "Continuar exemplo do celular" : phoneStatus.hasSaved ? "Refazer exemplo do celular" : "Começar exemplo do celular";
  return '<section class="hero"><div class="hero-copy"><span class="eyebrow">UM ESTÚDIO PARA APRENDER DECIDINDO</span><h1>Qual celular comprar?</h1><p>Comece com um caso pronto para entender o percurso: veja o modelo, julgue os critérios, compare os celulares e interprete o resultado. Depois, crie sua análise do zero.</p><div class="button-row"><button class="button" data-action="example" data-example="celular-universitario-v1">' + icon("sparkle") + ' ' + phoneLabel + '</button><button class="button secondary" data-action="new">' + icon("plus") + ' Criar do zero</button></div></div><div class="hero-art" aria-hidden="true"><div class="hero-card hero-card-a"><span>CRITÉRIO A</span><strong>Preço</strong><small>Quanto pesa?</small></div><div class="hero-card hero-card-b"><span>CRITÉRIO B</span><strong>Bateria</strong><small>Compare e descubra.</small></div><div class="hero-connector">×</div></div></section>' +
    '<div class="section-head example-section-head"><div><span class="eyebrow">CASOS PARA EXPLORAR</span><h2>Escolha um exemplo pronto</h2><p>Os dados estão preenchidos. Você faz os julgamentos, pode experimentar o fuzzy e vê como o resultado muda.</p></div></div>' +
    '<div class="example-grid">' + EXAMPLES.map(example => {
      const status = exampleStatus(example);
      const label = status.unfinished ? "Continuar caso" : status.hasSaved ? "Refazer caso" : "Explorar caso";
      return '<article class="example-card"><div class="example-card-top"><span class="eyebrow">' + escapeHtml(example.category) + '</span><span class="example-method">' + example.method.toUpperCase() + '</span></div><h3>' + escapeHtml(example.title) + '</h3><p>' + escapeHtml(example.description) + '</p><div class="example-criteria" aria-label="Critérios do exemplo">' + example.criteria.map(criterion => '<span>' + escapeHtml(criterion.name) + '</span>').join("") + '</div><div class="example-card-bottom"><small>3 opções · 3 critérios</small><button type="button" class="example-link" data-action="example" data-example="' + escapeHtml(example.key) + '">' + label + ' <span aria-hidden="true">→</span></button></div></article>';
    }).join("") + '</div>' +
    '<div class="section-head"><div><span class="eyebrow">CONTINUE DE ONDE PAROU</span><h2>Suas análises</h2></div><button class="button ghost" data-action="new">Nova análise ' + icon("arrow") + '</button></div>' +
    (recent.length ? '<div class="grid two">' + recent.map(item => {
      const status = analyses(item);
      return '<article class="card project-card"><span class="project-symbol">' + icon(item.method === "anp" ? "nodes" : "chart") + '</span><div class="project-card-body"><h3>' + escapeHtml(item.title) + '</h3><p>' + (item.guided ? "Exemplo guiado · " : "") + methodName(item) + ' · Atualizada em ' + date(item.updatedAt) + (status.ranking ? ' · ' + status.ranking.length + ' alternativas' : '') + '</p></div><div class="project-actions"><button class="button secondary small-btn" data-action="open" data-id="' + escapeHtml(item.id) + '">Abrir ' + icon("arrow") + '</button><button class="icon-button" title="Duplicar análise" aria-label="Duplicar ' + escapeHtml(item.title) + '" data-action="duplicate" data-id="' + escapeHtml(item.id) + '">' + icon("copy") + '</button><button class="icon-button" title="Excluir análise" aria-label="Excluir ' + escapeHtml(item.title) + '" data-action="delete" data-id="' + escapeHtml(item.id) + '">' + icon("trash") + '</button></div></article>';
    }).join("") + '</div>' : '<div class="card empty">' + icon("grid") + '<strong>Seu espaço de trabalho está pronto.</strong><p>Crie uma análise ou explore um exemplo preenchido para conhecer a plataforma.</p></div>') +
    '<div class="section-head"><div><span class="eyebrow">ESCOLHA A ESTRUTURA</span><h2>Dois caminhos para modelar</h2></div></div>' +
    '<div class="grid two"><article class="card method-card"><span class="method-icon">' + icon("chart") + '</span><h3>AHP + desempenho</h3><p>Compare critérios com julgamentos exatos ou fuzzy e combine os pesos com o desempenho das alternativas.</p></article><article class="card method-card"><span class="method-icon">' + icon("nodes") + '</span><h3>ANP em rede</h3><p>Modele influências entre critérios, compare cada conjunto local com valores exatos ou fuzzy e calcule prioridades pela supermatriz limite.</p></article></div>' +
    '<p class="footer-note">DecisionLab 2.0 · Plataforma local para análise multicritério. Os dados permanecem no seu navegador.</p>';
}
function pageHead(item, eyebrow, title, description, actions = "") {
  return '<div class="workspace-head"><div><span class="eyebrow">' + eyebrow + '</span><h1>' + title + '</h1><p>' + description + '</p></div><div class="button-row no-print">' + actions + '</div></div>';
}
function statusSide(item, analysis) {
  const judgments = item.method === "ahp" ? comparisonProgress(item.criteria.map(c => c.id), item.comparisons.base) :
    item.criteria.reduce((sum, criterion) => {
      const ids = item.criteria.filter(c => (item.influences[criterion.id] || []).includes(c.id)).map(c => c.id);
      const value = comparisonProgress(ids, item.comparisons.influence[criterion.id] || {});
      return { completed: sum.completed + value.completed, total: sum.total + value.total };
    }, { completed: 0, total: 0 });
  const steps = [
    [item.objective.trim().length > 0, "Descrever a decisão"],
    [item.criteria.length >= 2 && item.alternatives.length >= 2, "Definir critérios e opções"],
    [analysis.model.ready, "Concluir julgamentos"],
    [analysis.evaluation.ready, "Avaliar alternativas"],
    [Boolean(analysis.ranking), "Interpretar o ranking"],
  ];
  const count = steps.filter(x => x[0]).length;
  return '<aside class="stack"><section class="card"><div class="card-head"><div><h3>Progresso da análise</h3><p>' + count + ' de 5 etapas prontas</p></div></div><div class="progress-line"><span>Modelo e dados</span><strong>' + pct(count / 5) + '</strong></div><div class="progress"><span style="width:' + pct(count / 5) + '"></span></div><div class="step-list">' + steps.map(([done, label], i) => '<div class="step"><span class="step-number ' + (done ? "done" : "") + '">' + (done ? icon("check") : i + 1) + '</span><strong>' + label + '</strong></div>').join("") + '</div></section>' +
    '<section class="card"><div class="card-head"><div><h3>Seu modelo</h3><p>' + methodName(item) + '</p></div></div><div class="metric-grid" style="grid-template-columns:1fr 1fr"><div class="metric"><span>Critérios</span><strong>' + item.criteria.length + '</strong></div><div class="metric"><span>Alternativas</span><strong>' + item.alternatives.length + '</strong></div></div><div class="divider"></div><div class="progress-line"><span>Julgamentos</span><strong>' + judgments.completed + '/' + judgments.total + '</strong></div><div class="progress"><span style="width:' + pct(judgments.total ? judgments.completed / judgments.total : 0) + '"></span></div></section></aside>';
}
function overview(item) {
  const analysis = analyses(item);
  const context = item.guided
    ? '<div class="guided-objective"><span class="eyebrow">PERGUNTA DESTE EXEMPLO</span><h3>' + escapeHtml(item.title) + '</h3><p>' + escapeHtml(item.objective) + '</p><small>Este objetivo é fixo para manter o exemplo coerente. Ao concluir, você poderá criar sua própria análise do zero.</small></div><div class="phone-options">' + item.alternatives.map(a => '<span>' + escapeHtml(a.name) + '</span>').join("") + '</div>'
    : '<label class="field"><span class="label">Nome da análise</span><input class="input" data-field="title" maxlength="100" value="' + escapeHtml(item.title) + '"></label><label class="field"><span class="label">Objetivo da decisão</span><textarea class="textarea" data-field="objective" placeholder="Ex.: escolher um celular equilibrando preço, bateria e câmera.">' + escapeHtml(item.objective) + '</textarea><span class="field-hint">Descreva a escolha em uma frase. Ela aparecerá no relatório.</span></label>';
  return pageHead(item, "ETAPA 01 DE 05 · PROBLEMA", item.guided ? "Comece pela pergunta." : "Defina a decisão", item.guided ? "Neste exemplo, você vai comparar três opções fictícias com critérios e dados já preparados." : "Formule o problema. Você criará os critérios e as alternativas na etapa seguinte.", '<button class="button" data-action="view" data-view="structure">Montar o modelo ' + icon("arrow") + '</button>') +
    '<div class="workspace-grid"><div class="stack"><section class="card"><div class="card-head"><div><h3>' + (item.guided ? "O caso que vamos estudar" : "Contexto da análise") + '</h3><p>' + (item.guided ? "Observe as opções antes de comparar os critérios." : "Registre o que precisa ser decidido e por quê.") + '</p></div><span class="pill">01 / CONTEXTO</span></div>' + context + '</section>' +
    '<section class="card"><div class="card-head"><div><h3>Como os critérios se relacionam?</h3><p>Escolha a estrutura que representa seu problema.</p></div><span class="pill">02 / MODELO</span></div><div class="method-choice">' +
    '<button class="choice ' + (item.method === "ahp" ? "active" : "") + '" data-action="method" data-method="ahp"><strong>AHP + desempenho</strong><span>Compare a importância dos critérios. Você pode indicar incerteza fuzzy em cada resposta.</span></button>' +
    '<button class="choice ' + (item.method === "anp" ? "active" : "") + '" data-action="method" data-method="anp"><strong>ANP em rede</strong><span>Modele influências entre critérios. As comparações locais também aceitam incerteza fuzzy.</span></button></div><p class="field-hint" style="margin:13px 0 0">Ao mudar o método, os julgamentos de cada modelo permanecem guardados separadamente.</p></section>' +
    '<div class="helper"><strong>Sobre o escopo do ANP:</strong> esta versão trabalha com uma rede de um grupo de critérios. As alternativas são pontuadas após o cálculo dos pesos. O resultado explicita essa combinação no relatório.</div></div>' + statusSide(item, analysis) + '</div>';
}
function entityList(item, kind) {
  if (kind === "criterion") return '<div class="entity-list">' + item.criteria.map(c => '<div class="entity"><input class="input" aria-label="Nome do critério" data-field="criterion-name" data-id="' + escapeHtml(c.id) + '" value="' + escapeHtml(c.name) + '"><select class="select" aria-label="Tipo do critério" data-field="criterion-type" data-id="' + escapeHtml(c.id) + '"><option value="benefit"' + (c.type === "benefit" ? " selected" : "") + '>Benefício</option><option value="cost"' + (c.type === "cost" ? " selected" : "") + '>Custo</option></select><input class="input" aria-label="Unidade do critério" data-field="criterion-unit" data-id="' + escapeHtml(c.id) + '" placeholder="Unidade" value="' + escapeHtml(c.unit || "") + '"><button class="icon-button" title="Remover critério" aria-label="Remover critério ' + escapeHtml(c.name) + '" data-action="remove-criterion" data-id="' + escapeHtml(c.id) + '">' + icon("trash") + '</button></div>').join("") + '</div><div class="add-row"><input id="new-criterion" class="input" maxlength="50" placeholder="Nome do novo critério"><button class="button secondary" data-action="add-criterion">' + icon("plus") + ' Adicionar</button></div>';
  return '<div class="entity-list">' + item.alternatives.map(a => '<div class="entity alt"><input class="input" aria-label="Nome da alternativa" data-field="alternative-name" data-id="' + escapeHtml(a.id) + '" value="' + escapeHtml(a.name) + '"><button class="icon-button" title="Remover alternativa" aria-label="Remover ' + escapeHtml(a.name) + '" data-action="remove-alternative" data-id="' + escapeHtml(a.id) + '">' + icon("trash") + '</button></div>').join("") + '</div><div class="add-row"><input id="new-alternative" class="input" maxlength="50" placeholder="Nome da nova alternativa"><button class="button secondary" data-action="add-alternative">' + icon("plus") + ' Adicionar</button></div>';
}
function networkGraph(item, target) {
  const criteria = item.criteria;
  const objective = (item.objective || item.title || "Defina o objetivo na visão geral").trim();
  const layout = criteria.length === 3 ? "three" : criteria.length === 2 ? "two" : "many";
  const alternatives = item.alternatives.length
    ? item.alternatives.map(a => '<button type="button" data-action="edit-alternative" data-id="' + escapeHtml(a.id) + '" title="Editar ' + escapeHtml(a.name) + '">' + escapeHtml(a.name) + '</button>').join("")
    : '<span class="anp-map-empty">Adicione alternativas abaixo do mapa.</span>';
  return '<div class="anp-map" role="group" aria-label="Mapa ANP da decisão"><div class="anp-goal"><small>OBJETIVO</small><strong>' + escapeHtml(objective) + '</strong></div>' +
    '<div class="anp-criteria ' + layout + '"><svg class="anp-arrows" aria-hidden="true"></svg>' +
    (criteria.length ? criteria.map((c, index) => '<button type="button" class="anp-criterion' + (c.id === target ? " active" : "") + '" data-action="target" data-id="' + escapeHtml(c.id) + '" aria-pressed="' + (c.id === target) + '"><small>CRITÉRIO ' + String(index + 1).padStart(2, "0") + '</small><strong>' + escapeHtml(c.name) + '</strong></button>').join("") : '<p class="anp-map-empty">Adicione critérios abaixo do mapa para formar a rede.</p>') + '</div>' +
    '<div class="anp-alternatives"><span>ALTERNATIVAS</span><div>' + alternatives + '</div></div></div>';
}
function drawNetworkEdges() {
  const item = project();
  const area = document.querySelector(".anp-criteria");
  const svg = area?.querySelector(".anp-arrows");
  if (!item || item.method !== "anp" || !area || !svg) return;
  const areaBox = area.getBoundingClientRect();
  const cards = new Map([...area.querySelectorAll(".anp-criterion")].map(card => {
    const rect = card.getBoundingClientRect();
    return [card.dataset.id, { x: rect.left - areaBox.left, y: rect.top - areaBox.top, width: rect.width, height: rect.height }];
  }));
  const target = cards.get(state.target);
  const width = areaBox.width, height = areaBox.height;
  if (!target || !width || !height) return;
  const middle = box => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
  const edge = (box, ux, uy, extra = 0) => {
    const distance = Math.min(box.width / 2 / (Math.abs(ux) || Infinity), box.height / 2 / (Math.abs(uy) || Infinity)) + extra;
    const center = middle(box);
    return { x: center.x + ux * distance, y: center.y + uy * distance };
  };
  const paths = (item.influences[state.target] || []).filter(id => cards.has(id)).map(id => {
    const source = cards.get(id);
    if (id === state.target) {
      const right = middle(target).x < width / 2;
      const side = right ? 1 : -1;
      const x = right ? target.x + target.width : target.x;
      const y = target.y + target.height / 2;
      return '<path class="network-edge network-self" d="M ' + x + ' ' + (y - 13) + ' C ' + (x + side * 43) + ' ' + (y - 45) + ' ' + (x + side * 51) + ' ' + (y + 45) + ' ' + x + ' ' + (y + 13) + '" marker-end="url(#anp-arrow)"/>';
    }
    const a = middle(source), b = middle(target);
    const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy) || 1;
    const ux = dx / length, uy = dy / length;
    const start = edge(source, ux, uy, 6);
    const end = edge(target, -ux, -uy, 11);
    const bend = Math.min(78, Math.max(32, length * .22));
    const cx = (start.x + end.x) / 2 + uy * bend;
    const cy = Math.abs(dy) < 24 ? Math.min(start.y, end.y) - bend : (start.y + end.y) / 2 - ux * bend;
    return '<path class="network-edge" d="M ' + start.x + ' ' + start.y + ' Q ' + cx + ' ' + cy + ' ' + end.x + ' ' + end.y + '" marker-end="url(#anp-arrow)"/>';
  }).join("");
  svg.setAttribute("viewBox", '0 0 ' + width + ' ' + height);
  const arrow = width < 400 ? 5 : 7;
  svg.innerHTML = '<defs><marker id="anp-arrow" markerWidth="' + arrow + '" markerHeight="' + arrow + '" refX="' + (arrow - 1) + '" refY="' + (arrow / 2) + '" orient="auto"><path d="M0 0 L' + arrow + ' ' + (arrow / 2) + ' L0 ' + arrow + ' Z" fill="#3166b6"/></marker></defs>' + paths;
}
function networkEditor(item) {
  const ids = item.criteria.map(c => c.id);
  const target = ids.includes(state.target) ? state.target : ids[0];
  state.target = target;
  const status = networkStatus(ids, item.influences);
  return '<section class="card structure-visual network-visual"><div class="card-head"><div><span class="eyebrow">MAPA EDITÁVEL</span><h3>Rede de influências</h3><p>Selecione um critério e indique quais elementos o influenciam.</p></div>' + structureMethodSwitch(item) + '</div>' +
    '<div class="network-layout"><div class="network-canvas">' + networkGraph(item, target) + '</div><div><span class="label">Critério observado</span><div class="network-targets" style="margin-top:10px">' + item.criteria.map(c => '<button class="target-button ' + (c.id === target ? "active" : "") + '" data-action="target" data-id="' + escapeHtml(c.id) + '">' + escapeHtml(c.name) + '</button>').join("") + '</div></div></div>' +
    '<div class="divider"></div><span class="label">Quais critérios influenciam ' + escapeHtml(criterionName(item, target)) + '?</span><div class="check-list">' + item.criteria.map(c => '<label class="check-pill"><input type="checkbox" data-influence data-target="' + escapeHtml(target) + '" data-source="' + escapeHtml(c.id) + '"' + ((item.influences[target] || []).includes(c.id) ? " checked" : "") + '> ' + escapeHtml(c.name) + (c.id === target ? " (si mesmo)" : "") + '</label>').join("") + '</div><p class="field-hint" style="margin:12px 0 0">As setas mostram influências recebidas pelo critério selecionado. Cada coluna da supermatriz é calculada por comparações locais.</p>' +
    '<div class="notice ' + (status.valid ? "" : "warn") + '" style="margin-top:14px">' + (status.valid ? "Rede conectada e pronta para receber julgamentos." : escapeHtml(status.reason)) + '</div></section>';
}
function structureMethodSwitch(item) {
  return '<div class="structure-method"><span>Os critérios se influenciam?</span><div class="structure-method-buttons" role="group" aria-label="Estrutura do modelo"><button type="button" data-action="method" data-method="ahp" aria-pressed="' + (item.method === "ahp") + '" class="' + (item.method === "ahp" ? "active" : "") + '">Não<small>AHP</small></button><button type="button" data-action="method" data-method="anp" aria-pressed="' + (item.method === "anp") + '" class="' + (item.method === "anp" ? "active" : "") + '">Sim<small>ANP</small></button></div></div>';
}
function hierarchyPreview(item) {
  const objective = (item.objective || item.title || "Defina o objetivo na visão geral").trim();
  const selected = item.criteria.find(c => c.id === state.target) || item.criteria[0];
  state.target = selected?.id || null;
  const criteria = item.criteria.length ? item.criteria.map((c, index) => '<button type="button" class="hierarchy-criterion' + (c.id === state.target ? " active" : "") + '" data-action="target" data-id="' + escapeHtml(c.id) + '" aria-pressed="' + (c.id === state.target) + '"><small>CRITÉRIO ' + String(index + 1).padStart(2, "0") + '</small><strong>' + escapeHtml(c.name) + '</strong></button>').join("") : '<p class="hierarchy-empty">Adicione seu primeiro critério abaixo do mapa.</p>';
  const alternatives = item.alternatives.length ? item.alternatives.map(a => '<button type="button" data-action="edit-alternative" data-id="' + escapeHtml(a.id) + '" title="Editar ' + escapeHtml(a.name) + '">' + escapeHtml(a.name) + '</button>').join("") : '<span class="hierarchy-empty">Adicione alternativas abaixo do mapa.</span>';
  const inspector = selected ? '<span class="eyebrow">CRITÉRIO SELECIONADO</span><h3>' + escapeHtml(selected.name) + '</h3><label class="label" for="map-criterion-name">Nome do critério</label><input class="input" id="map-criterion-name" data-field="criterion-name" data-id="' + escapeHtml(selected.id) + '" maxlength="50" value="' + escapeHtml(selected.name) + '"><label class="label" for="map-criterion-type">Como interpretar o valor?</label><select class="select" id="map-criterion-type" data-field="criterion-type" data-id="' + escapeHtml(selected.id) + '"><option value="benefit"' + (selected.type === "benefit" ? " selected" : "") + '>Maior é melhor · benefício</option><option value="cost"' + (selected.type === "cost" ? " selected" : "") + '>Menor é melhor · custo</option></select><label class="label" for="map-criterion-unit">Unidade de medida</label><input class="input" id="map-criterion-unit" data-field="criterion-unit" data-id="' + escapeHtml(selected.id) + '" placeholder="Ex.: R$, horas, nota" value="' + escapeHtml(selected.unit || "") + '"><p class="inspector-note">' + (selected.type === "cost" ? "Em medidas reais, valores menores são preferíveis." : "Em medidas reais, valores maiores são preferíveis.") + ' Nas notas de 0 a 10, 10 sempre representa o melhor desempenho.</p><button type="button" class="button secondary inspector-remove" data-action="remove-criterion" data-id="' + escapeHtml(selected.id) + '">Remover critério</button>' : '<span class="eyebrow">COMECE AQUI</span><h3>Seu primeiro critério</h3><p class="small muted">Crie um critério na seção abaixo. Ele aparecerá no mapa e você poderá editá-lo aqui.</p><button type="button" class="button secondary" data-action="focus-add-criterion">Adicionar critério</button>';
  return '<div class="hierarchy-layout"><section class="card structure-visual hierarchy-visual"><div class="card-head"><div><span class="eyebrow">MAPA EDITÁVEL</span><h3>Hierarquia da decisão</h3><p>Selecione um critério no mapa para editá-lo.</p></div>' + structureMethodSwitch(item) + '</div>' +
    '<div class="hierarchy-canvas" role="group" aria-label="Hierarquia da decisão"><div class="hierarchy-goal"><small>OBJETIVO</small><strong>' + escapeHtml(objective) + '</strong></div><div class="hierarchy-link"><span>critérios que importam</span></div><div class="hierarchy-criteria' + (item.criteria.length > 4 ? " dense" : "") + (item.criteria.length ? "" : " empty") + '">' + criteria + '</div><div class="hierarchy-link"><span>desempenho em cada critério</span></div><div class="hierarchy-alternatives"><span>ALTERNATIVAS</span><div>' + alternatives + '</div></div></div>' +
    '<p class="map-footnote">No AHP, você compara os critérios para obter pesos e informa o desempenho de cada alternativa.</p></section><aside class="card hierarchy-inspector">' + inspector + '</aside></div>';
}
function structure(item) {
  return pageHead(item, "ETAPA 02 DE 05 · MODELO", "Monte o modelo", "Visualize a estrutura, edite o mapa e adicione elementos abaixo.", '<button class="button" data-action="view" data-view="judgments">Ir aos julgamentos ' + icon("arrow") + '</button>') +
    (item.method === "anp" ? networkEditor(item) : hierarchyPreview(item)) +
    '<div class="workspace-grid"><div class="stack"><section class="card"><div class="card-head"><div><h3>Critérios</h3><p>O que importa para a decisão? Classifique valores maiores como benefício ou custo.</p></div><span class="pill">' + item.criteria.length + ' critérios</span></div>' + entityList(item, "criterion") + '</section>' +
    '<section class="card"><div class="card-head"><div><h3>Alternativas</h3><p>As opções entre as quais você precisa escolher.</p></div><span class="pill">' + item.alternatives.length + ' opções</span></div>' + entityList(item, "alternative") + '</section>' +
    '</div><aside class="stack"><section class="card"><h3>Como organizar critérios</h3><p class="small muted">Use fatores distintos e relevantes. Evite contar a mesma característica duas vezes com nomes diferentes.</p><div class="divider"></div><p class="small muted"><strong>Benefício:</strong> maior valor bruto é melhor.<br><strong>Custo:</strong> menor valor bruto é melhor.</p><p class="small muted">No modo de notas de 0 a 10, 10 sempre significa melhor desempenho, independentemente do tipo.</p></section><section class="card"><h3>Próxima etapa</h3><p class="small muted">Registre comparações par a par. A plataforma só calcula pesos quando todos os julgamentos necessários estiverem preenchidos.</p><button class="button secondary" data-action="view" data-view="judgments">Abrir julgamentos ' + icon("arrow") + '</button></section></aside></div>';
}
function comparisonOptions(left, right, current, kind) {
  const relation = kind === "anp" ? "influencia mais" : "é mais importante";
  const options = ['<option value="">Selecione o julgamento</option>'];
  for (const scale of [...SAATY].reverse()) {
    options.push('<option value="' + scale.value + '"' + (current === scale.value ? " selected" : "") + '>' + escapeHtml(left) + " " + relation + " · " + scale.value + "×</option>");
  }
  options.push('<option value="1"' + (current === 1 ? " selected" : "") + '>Igual importância / influência</option>');
  for (const scale of SAATY) {
    const value = 1 / scale.value;
    options.push('<option value="' + value + '"' + (current === value ? " selected" : "") + '>' + escapeHtml(right) + " " + relation + " · " + scale.value + "×</option>");
  }
  return options.join("");
}
function matrixTable(ids, matrix, item, title = "Matriz de comparação", description = "Valores recíprocos registrados para cada par.") {
  if (!matrix) return "";
  return '<div class="divider"></div><div class="card-head"><div><h3>' + title + '</h3><p>' + description + '</p></div></div><div class="table-scroll"><table class="matrix-table"><thead><tr><th></th>' + ids.map(id => '<th>' + escapeHtml(criterionName(item, id)) + '</th>').join("") + '</tr></thead><tbody>' + ids.map((id, i) => '<tr><th>' + escapeHtml(criterionName(item, id)) + '</th>' + matrix[i].map(value => '<td>' + Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 3 }) + '</td>').join("") + '</tr>').join("") + '</tbody></table></div>';
}
function judgments(item) {
  const isAnp = item.method === "anp";
  const ids = item.criteria.map(c => c.id);
  const target = ids.includes(state.target) ? state.target : ids[0];
  state.target = target;
  const currentIds = isAnp ? ids.filter(id => (item.influences[target] || []).includes(id)) : ids;
  const comparisons = isAnp ? (item.comparisons.influence[target] || {}) : item.comparisons.base;
  const progress = comparisonProgress(currentIds, comparisons);
  const matrix = comparisonMatrix(currentIds, comparisons);
  const check = matrix && currentIds.length > 1 ? consistency(matrix, principalEigenvector(matrix)) : null;
  const side = '<aside class="stack"><section class="card"><h3>Qualidade dos julgamentos</h3><p class="small muted">A razão de consistência (CR) indica se as preferências registradas se contradizem. Até 10% é um parâmetro usual para revisão.</p>' +
    (check ? (check.available ? '<div class="notice ' + (check.acceptable ? "" : "warn") + '">CR desta matriz: <strong>' + pct(check.cr, 1) + '</strong>. ' + (check.acceptable ? "Julgamentos dentro do limite de referência." : "Revise os pares que podem estar em conflito.") + '</div>' : '<div class="notice warn">CR indisponível para mais de 10 elementos nesta versão.</div>') : '<div class="notice">Complete os pares para ver a consistência desta matriz.</div>') +
    '</section><section class="card"><h3>Escala de comparação</h3><p class="small muted">1 representa igualdade; 3 indica preferência moderada; 5 forte; 7 muito forte; 9 extrema. Os valores pares são intermediários.</p><p class="small muted">Cada par precisa de uma resposta explícita. Você pode retornar e alterar qualquer julgamento.</p></section></aside>';
  let content = "";
  if (ids.length < 2) {
    content = '<div class="card empty"><h3>Adicione ao menos dois critérios.</h3><button class="button" data-action="view" data-view="structure">Abrir estrutura</button></div>';
  } else {
    const network = isAnp ? networkStatus(ids, item.influences) : { valid: true };
    content = (isAnp ? '<section class="card"><div class="card-head"><div><h3>Influência sobre cada critério</h3><p>Compare os elementos que influenciam o critério selecionado.</p></div><span class="pill">ANP</span></div><div class="network-targets" style="display:flex;flex-direction:row;flex-wrap:wrap">' + item.criteria.map(c => {
      const influencers = ids.filter(id => (item.influences[c.id] || []).includes(id));
      const p = comparisonProgress(influencers, item.comparisons.influence[c.id] || {});
      return '<button class="target-button ' + (c.id === target ? "active" : "") + '" style="width:auto" data-action="target" data-id="' + escapeHtml(c.id) + '">' + escapeHtml(c.name) + ' · ' + p.completed + '/' + p.total + '</button>';
    }).join("") + '</div>' + (!network.valid ? '<div class="notice warn" style="margin-top:13px">' + escapeHtml(network.reason) + '</div>' : "") + '</section>' : "") +
      '<section class="card"><div class="card-head"><div><h3>' + (isAnp ? "Comparações relativas a " + escapeHtml(criterionName(item, target)) : "Comparação dos critérios") + '</h3><p>' + (isAnp ? "Qual elemento exerce maior influência sobre este critério?" : "Qual critério importa mais para alcançar o objetivo?") + '</p></div><span class="pill">' + progress.completed + ' / ' + progress.total + '</span></div>' +
      '<div class="progress-line"><span>Julgamentos preenchidos</span><strong>' + pct(progress.total ? progress.completed / progress.total : 1) + '</strong></div><div class="progress"><span style="width:' + pct(progress.total ? progress.completed / progress.total : 1) + '"></span></div><div class="divider"></div>' +
      (pairs(currentIds).length ? pairs(currentIds).map(([a, b], index) => {
        const left = criterionName(item, a), right = criterionName(item, b);
        const current = pairValue(comparisons, a, b);
        return '<div class="compare-card ' + (current !== null ? "done" : "") + '"><div class="compare-title">' + String(index + 1).padStart(2, "0") + ' · ' + escapeHtml(left) + ' × ' + escapeHtml(right) + '</div><div class="compare-control"><span class="compare-side">' + escapeHtml(left) + '</span><select class="select" aria-label="Comparar ' + escapeHtml(left) + ' e ' + escapeHtml(right) + '" data-pair data-kind="' + (isAnp ? "anp" : "ahp") + '" data-target="' + escapeHtml(target || "") + '" data-a="' + escapeHtml(a) + '" data-b="' + escapeHtml(b) + '">' + comparisonOptions(left, right, current, item.method) + '</select><span class="compare-side">' + escapeHtml(right) + '</span></div></div>';
      }).join("") : '<div class="helper">Somente um elemento influencia este critério. Seu peso local é 100%, sem necessidade de comparação.</div>') +
      matrixTable(currentIds, matrix, item) + '</section>';
  }
  return pageHead(item, "JULGAMENTOS", isAnp ? "Compare influências" : "Compare prioridades", "Cada julgamento alimenta uma matriz. A consistência aparece assim que seus pares estão completos.", '<button class="button" data-action="view" data-view="evaluations">Avaliar alternativas ' + icon("arrow") + '</button>') +
    '<div class="workspace-grid"><div class="stack">' + content + '</div>' + side + '</div>';
}
function closeNumber(a, b) { return Math.abs(a - b) < 1e-8; }
function pairDescription(left, right, ratio, influence = false) {
  if (ratio === null) return "Escolha uma resposta para continuar.";
  if (closeNumber(ratio, 1)) return left + " e " + right + " têm a mesma " + (influence ? "influência." : "importância.");
  const preferred = ratio > 1 ? left : right;
  const strength = Math.round(Math.max(ratio, 1 / ratio));
  return influence ? preferred + " exerce influência de intensidade " + strength + " em relação ao outro critério." : preferred + " tem preferência de intensidade " + strength + " sobre o outro critério.";
}
function ratioText(value) {
  if (closeNumber(value, 1)) return "1";
  if (value < 1) return "1/" + Math.round(1 / value);
  return String(Math.round(value));
}
function fuzzyControl(item, a, b, current, target) {
  if (current === null) return "";
  const fuzzyStore = item.method === "anp" ? item.comparisons.fuzzyInfluence?.[target] || {} : item.comparisons.fuzzyBase || {};
  const triangle = fuzzyPairValue(fuzzyStore, a, b);
  const approx = approximateTriangle(current);
  const key = (item.method === "anp" ? target + ":" : "") + pairKey(a, b);
  const custom = triangle && (state.fuzzyCustomFor === key ||
    ![["l", approx.l], ["m", approx.m], ["u", approx.u]].every(([part, value]) => closeNumber(triangle[part], value)));
  const mode = !triangle ? "exact" : custom ? "custom" : "approx";
  const values = [...Array.from({ length: 8 }, (_, i) => 1 / (9 - i)), 1, ...Array.from({ length: 8 }, (_, i) => i + 2)];
  const option = (value, selected) => {
    const label = value > 1 ? criterionName(item, a) + " " + ratioText(value) + "×" :
      value < 1 ? criterionName(item, b) + " " + ratioText(1 / value) + "×" : "Igual";
    return '<option value="' + value + '"' + (closeNumber(value, selected) ? " selected" : "") + '>' + escapeHtml(label) + '</option>';
  };
  return '<div class="fuzzy-panel"><div class="card-head"><div><h3>O quanto este julgamento é preciso?</h3><p>A faixa representa imprecisão, não probabilidade. ' + (item.method === "anp" ? "No ANP, ela altera as prioridades locais antes da supermatriz." : "No AHP, ela altera os pesos dos critérios.") + '</p></div><span class="pill amber">FUZZY · OPCIONAL</span></div><div class="fuzzy-modes">' +
    [['exact', "Exato"], ['approx', "Aproximado"], ['custom', "Definir faixa"]].map(([value, label]) =>
      '<button class="fuzzy-mode ' + (mode === value ? "active" : "") + '" data-action="fuzzy-mode" data-mode="' + value + '" aria-pressed="' + (mode === value) + '">' + label + '</button>').join("") +
    '</div>' +
    (triangle ? '<div class="fuzzy-band"><span>Limite inferior <b>' + ratioText(triangle.l) + '</b></span><span>Valor central <b>' + ratioText(triangle.m) + '</b></span><span>Limite superior <b>' + ratioText(triangle.u) + '</b></span></div>' : "") +
    (mode === "custom" ? '<div class="fuzzy-custom"><label class="field"><span class="label">Mínimo plausível</span><select class="select" data-fuzzy-bound="l">' + values.filter(value => value <= current + 1e-9).map(value => option(value, triangle.l)).join("") + '</select></label><label class="field"><span class="label">Máximo plausível</span><select class="select" data-fuzzy-bound="u">' + values.filter(value => value >= current - 1e-9).map(value => option(value, triangle.u)).join("") + '</select></label></div>' : "") +
    '</div>';
}
function saatyGuide(current, check, isAnp) {
  const strength = current === null ? null : Math.max(current, 1 / current);
  const rows = [{ value: 1, label: "Igual importância" }, ...SAATY.map(x => ({ value: x.value, label: "Preferência " + x.label.toLowerCase() }))];
  return '<aside class="stack judgment-aside"><section class="card scale-guide"><span class="eyebrow">CONSULTA RÁPIDA</span><h3>Escala de Saaty</h3><p class="small muted">A intensidade vale para o critério escolhido. Os valores pares são intermediários.</p><div class="scale-list">' +
    rows.map(row => '<div class="scale-row ' + (strength !== null && closeNumber(strength, row.value) ? "active" : "") + '"><b>' + row.value + '</b><span>' + row.label + '</span></div>').join("") +
    '</div><p class="field-hint" style="margin:13px 0 0">A comparação inversa é registrada automaticamente.</p></section>' +
    '<section class="card"><h3>Consistência</h3><p class="small muted">A razão de consistência é calculada quando a matriz está completa.' + (isAnp ? " Cada conjunto de influência é verificado separadamente." : " No AHP fuzzy, ela considera os valores centrais.") + '</p>' +
    (check ? '<div class="notice ' + (check.acceptable ? "" : "warn") + '">CR: <strong>' + (check.available ? pct(check.cr, 1) : "indisponível") + '</strong>. ' + (check.available ? (check.acceptable ? "Dentro do limite de 10%." : "Revise os julgamentos.") : "Há mais de 10 elementos.") + '</div>' :
      '<div class="notice">Complete o conjunto para verificar a consistência.</div>') + '</section></aside>';
}
function guidedJudgments(item) {
  const isAnp = item.method === "anp";
  const ids = item.criteria.map(c => c.id);
  const target = ids.includes(state.target) ? state.target : ids[0];
  state.target = target;
  const currentIds = isAnp ? ids.filter(id => (item.influences[target] || []).includes(id)) : ids;
  const comparisons = isAnp ? (item.comparisons.influence[target] || {}) : item.comparisons.base;
  const list = pairs(currentIds);
  const progress = comparisonProgress(currentIds, comparisons);
  state.judgmentIndex = Math.max(0, Math.min(state.judgmentIndex, Math.max(0, list.length - 1)));
  const [a, b] = list[state.judgmentIndex] || [];
  const current = a ? pairValue(comparisons, a, b) : null;
  const matrix = comparisonMatrix(currentIds, comparisons);
  const check = matrix && currentIds.length > 1 ? consistency(matrix, principalEigenvector(matrix)) : null;
  const network = isAnp ? networkStatus(ids, item.influences) : { valid: true };
  const targets = isAnp ? '<section class="card"><div class="card-head"><div><h3>Critério influenciado</h3><p>Conclua as comparações locais de cada coluna da rede.</p></div><span class="pill">ANP</span></div><div class="target-tabs">' +
    item.criteria.map(c => {
      const incoming = ids.filter(id => (item.influences[c.id] || []).includes(id));
      const p = comparisonProgress(incoming, item.comparisons.influence[c.id] || {});
      return '<button class="target-button ' + (c.id === target ? "active" : "") + '" data-action="target" data-id="' + escapeHtml(c.id) + '" aria-pressed="' + (c.id === target) + '">' + escapeHtml(c.name) + ' <span>' + p.completed + '/' + p.total + '</span></button>';
    }).join("") + '</div>' + (!network.valid ? '<div class="notice warn" style="margin-top:14px">' + escapeHtml(network.reason) + '</div>' : "") + '</section>' : "";
  let question = "";
  if (ids.length < 2) {
    question = '<section class="card empty"><h3>Adicione pelo menos dois critérios.</h3><button class="button" data-action="view" data-view="structure">Abrir estrutura</button></section>';
  } else if (!list.length) {
    question = '<section class="card"><h3>Nenhuma comparação necessária neste conjunto</h3><p class="muted">' + (currentIds.length === 1 ? "Um único elemento influencia este critério. Seu peso local é 100%." : "Defina pelo menos uma influência para este critério na estrutura da rede.") + '</p><button class="button" data-action="judgment-next">Próximo conjunto ' + icon("arrow") + '</button></section>';
  } else {
    const left = criterionName(item, a), right = criterionName(item, b);
    const selectedSide = current === null || closeNumber(current, 1) ? null : current > 1 ? "left" : "right";
    const intensity = current === null ? null : Math.round(Math.max(current, 1 / current));
    const strengthButtons = [{ value: 1, label: "Igual importância" }, ...SAATY].map(scale => {
      const selected = intensity === scale.value;
      return '<button class="studio-strength ' + (selected ? "selected" : "") + '" data-action="set-intensity" data-value="' + scale.value + '" aria-label="Intensidade ' + scale.value + ': ' + escapeHtml(scale.label.toLowerCase()) + '" aria-pressed="' + selected + '"' + (current === null && scale.value !== 1 ? " disabled" : "") + '>' + scale.value + '</button>';
    }).join("");
    question = '<section class="card guided-card"><div class="card-head"><div><span class="eyebrow">JULGAMENTO ' + (state.judgmentIndex + 1) + ' DE ' + list.length + '</span><h2 style="margin:9px 0 5px">' + (isAnp ? "Qual critério influencia mais?" : "Qual critério pesa mais?") + '</h2><p>' + (isAnp ? "Comparação de influência sobre " + escapeHtml(criterionName(item, target)) + "." : "Considere o objetivo: " + escapeHtml((item.objective || item.title).trim().replace(/[.!?]$/, "")) + ".") + '</p></div></div>' +
      '<div class="progress-line"><span>' + progress.completed + ' de ' + progress.total + ' respondidos</span><strong>' + pct(progress.total ? progress.completed / progress.total : 1) + '</strong></div><div class="progress"><span style="width:' + pct(progress.total ? progress.completed / progress.total : 1) + '"></span></div>' +
      '<div class="studio-arena" role="group" aria-label="Escolha o critério com maior ' + (isAnp ? "influência" : "importância") + '"><button class="studio-criterion studio-left ' + (selectedSide === "left" ? "selected" : "") + '" data-action="set-side" data-side="left" aria-pressed="' + (selectedSide === "left") + '"><span>CRITÉRIO A</span><strong>' + escapeHtml(left) + '</strong><small>' + (selectedSide === "left" ? "Selecionado" : "Escolher") + '</small></button><span class="studio-versus">OU</span><button class="studio-criterion studio-right ' + (selectedSide === "right" ? "selected" : "") + '" data-action="set-side" data-side="right" aria-pressed="' + (selectedSide === "right") + '"><span>CRITÉRIO B</span><strong>' + escapeHtml(right) + '</strong><small>' + (selectedSide === "right" ? "Selecionado" : "Escolher") + '</small></button></div>' +
      '<div class="studio-intensity"><div><h3>Quão forte é essa preferência?</h3><p>' + (current === null ? "Escolha um critério ou marque 1 para igual" : "1 = igual · 9 = extrema") + '</p></div><div class="studio-strengths" role="group" aria-label="Intensidade na escala de Saaty">' + strengthButtons + '</div></div>' +
      '<div class="judgment-feedback ' + (current === null ? "empty-feedback" : "") + '">' + icon(current === null ? "info" : "check") + '<span>' + escapeHtml(pairDescription(left, right, current, isAnp)) + '</span></div>' +
      fuzzyControl(item, a, b, current, target) +
      '<div class="judgment-nav"><button class="button secondary" data-action="judgment-prev"' + (state.judgmentIndex === 0 ? " disabled" : "") + '>' + icon("back") + ' Anterior</button><button class="button" data-action="judgment-next"' + (current === null ? " disabled" : "") + '>Confirmar e próximo ' + icon("arrow") + '</button></div></section>';
  }
  const review = list.length ? '<details class="card review-card"><summary>Revisar todos os pares <span>' + progress.completed + '/' + progress.total + '</span></summary><div class="review-pairs">' + list.map(([x, y], index) => {
    const answered = pairValue(comparisons, x, y) !== null;
    return '<button class="review-pair ' + (index === state.judgmentIndex ? "active" : "") + '" data-action="judgment-jump" data-index="' + index + '"><span class="' + (answered ? "review-dot done" : "review-dot") + '"></span>' + escapeHtml(criterionName(item, x)) + ' × ' + escapeHtml(criterionName(item, y)) + '</button>';
  }).join("") + '</div>' + matrixTable(currentIds, matrix, item) + '</details>' : "";
  return pageHead(item, "ETAPA 03 DE 05 · JULGAMENTOS", isAnp ? "Compare influências" : "Compare prioridades", "Uma pergunta por vez, com a escala de Saaty sempre à vista.") +
    '<div class="workspace-grid"><div class="stack">' + targets + question + review + '</div>' + saatyGuide(current, check, isAnp) + '</div>';
}
function evaluations(item) {
  const status = evaluationStatus(item);
  const inputFor = (a, c) => {
    const value = item.evaluations[a.id]?.[c.id];
    return '<input class="input" type="number" inputmode="decimal" step="any" ' + (item.evaluationMode === "score" ? 'min="0" max="10" ' : "") +
      'aria-label="' + escapeHtml(a.name + " em " + c.name) + '" placeholder="—" data-eval data-alt="' + escapeHtml(a.id) + '" data-criterion="' + escapeHtml(c.id) + '" value="' + (value === null || value === undefined ? "" : escapeHtml(value)) + '">';
  };
  const columns = item.criteria.map(c => '<th>' + escapeHtml(c.name) + (item.evaluationMode === "raw" && c.unit ? '<br><span class="muted">' + escapeHtml(c.unit) + '</span>' : "") + '</th>').join("");
  const rows = item.alternatives.map(a => '<tr><td>' + escapeHtml(a.name) + '</td>' + item.criteria.map(c => '<td>' + inputFor(a, c) + '</td>').join("") + '</tr>').join("");
  const mobileRows = item.alternatives.map((a, index) => '<article class="mobile-evaluation"><div class="mobile-evaluation-head"><span>ALTERNATIVA ' + String(index + 1).padStart(2, "0") + '</span><h4>' + escapeHtml(a.name) + '</h4></div><div class="mobile-evaluation-fields">' + item.criteria.map(c => '<label class="mobile-evaluation-field"><span>' + escapeHtml(c.name) + (item.evaluationMode === "raw" && c.unit ? ' <small>' + escapeHtml(c.unit) + '</small>' : "") + '</span>' + inputFor(a, c) + '</label>').join("") + '</div></article>').join("");
  return pageHead(item, "ETAPA 04 DE 05 · DESEMPENHO", "Avalie as alternativas", "Informe o desempenho de cada opção em todos os critérios.", '<button class="button" data-action="view" data-view="results">Ver resultados ' + icon("arrow") + '</button>') +
    '<div class="workspace-grid"><div class="stack"><section class="card"><div class="card-head"><div><h3>Formato dos dados</h3><p>Escolha como deseja registrar o desempenho.</p></div><span class="pill">' + status.completed + '/' + status.total + ' valores</span></div><div class="method-choice"><button class="choice ' + (item.evaluationMode === "score" ? "active" : "") + '" data-action="evaluation-mode" data-mode="score"><strong>Nota de 0 a 10</strong><span>10 sempre representa o melhor desempenho, inclusive para critérios de custo.</span></button><button class="choice ' + (item.evaluationMode === "raw" ? "active" : "") + '" data-action="evaluation-mode" data-mode="raw"><strong>Valor bruto</strong><span>Digite valores reais; o tipo custo/benefício orienta a normalização.</span></button></div></section>' +
    '<section class="card"><div class="card-head"><div><h3>Matriz de desempenho</h3><p>Preencha todas as células para calcular o ranking.</p></div></div><div class="table-scroll desktop-evaluations"><table class="eval-table"><thead><tr><th>Alternativa</th>' + columns + '</tr></thead><tbody>' + rows + '</tbody></table></div><div class="mobile-evaluations">' + mobileRows + '</div><div class="divider"></div><div class="progress-line"><span>Preenchimento</span><strong>' + status.completed + ' de ' + status.total + '</strong></div><div class="progress"><span style="width:' + pct(status.total ? status.completed / status.total : 0) + '"></span></div></section></div>' +
    '<aside class="stack"><section class="card"><h3>Como a pontuação funciona?</h3>' + (item.evaluationMode === "score" ?
      '<p class="small muted">As notas são divididas por 10 e combinadas com os pesos dos critérios. Por isso, já devem expressar preferência: 10 é sempre melhor que 0.</p>' :
      '<p class="small muted">Cada critério é normalizado entre o menor e o maior valor informado. Benefícios crescem com o valor; custos são invertidos. Se todos os valores forem iguais, todas as alternativas recebem o mesmo desempenho naquele critério.</p>') +
      '</section><section class="card"><h3>Antes de concluir</h3><p class="small muted">Critérios sem dados e julgamentos incompletos impedem o ranking. Os resultados sempre mostram as escolhas metodológicas utilizadas.</p></section></aside></div>';
}
function weightBars(item, weights) {
  return item.criteria.map((c, i) => '<div class="weight-row"><strong>' + escapeHtml(c.name) + '</strong><div class="bar"><span style="width:' + pct(weights[i]) + '"></span></div><b>' + pct(weights[i], 1) + '</b></div>').join("");
}
function scoreBars(ranking) {
  return ranking.map((r, i) => '<div class="rank-row"><span class="rank-position">' + (i + 1) + 'º</span><span class="rank-name">' + escapeHtml(r.name) + '</span><span class="bar"><span style="width:' + pct(r.score) + '"></span></span><span class="rank-value">' + pct(r.score, 1) + '</span></div>').join("");
}
function resultConsistency(item, model) {
  if (item.method === "ahp") {
    const check = model.consistency;
    return '<div class="notice ' + (check.acceptable ? "" : "warn") + '"><strong>Consistência dos julgamentos' + (model.fuzzy ? " (valores centrais)" : "") + ':</strong> ' + (check.available ? "CR " + pct(check.cr, 1) + ". " + (check.acceptable ? "Dentro do limite de referência de 10%." : "Acima de 10%; revise a matriz de critérios.") : "CR indisponível para mais de 10 critérios.") + '</div>';
  }
  const questionable = model.local.filter(group => group.consistency.available && !group.consistency.acceptable);
  const missing = model.local.filter(group => !group.consistency.available);
  return '<div class="notice ' + (questionable.length || missing.length ? "warn" : "") + '"><strong>Consistência local' + (model.local.some(group => group.fuzzy) ? " (valores centrais)" : "") + ':</strong> ' + (questionable.length ? questionable.length + " matriz(es) acima de 10%; revise os julgamentos de influência." : "Todas as matrizes verificáveis estão dentro do limite de referência.") + (missing.length ? " " + missing.length + " matriz(es) excedem o limite de 10 elementos para CR." : "") + '</div>' +
    '<div class="step-list">' + model.local.map(group => '<div class="step"><span class="step-number ' + (group.consistency.acceptable ? "done" : "") + '">' + (group.consistency.acceptable ? icon("check") : "!") + '</span><strong>' + escapeHtml(criterionName(item, group.target)) + '</strong><span style="margin-left:auto">' + (group.consistency.available ? "CR " + pct(group.consistency.cr, 1) : "CR indisponível") + '</span></div>').join("") + '</div>';
}
function results(item) {
  const analysis = analyses(item);
  if (!analysis.ranking) {
    const needed = [
      !analysis.model.ready ? '<li><strong>Modelo:</strong> ' + escapeHtml(analysis.model.reason) + '</li>' : "",
      !analysis.evaluation.ready ? '<li><strong>Desempenho:</strong> preencha ' + (analysis.evaluation.total - analysis.evaluation.completed) + ' valor(es) na matriz de alternativas.</li>' : "",
    ].filter(Boolean).join("");
    return pageHead(item, "ETAPA 05 DE 05 · INTERPRETAÇÃO", "Resultado em preparação", "Complete os dados abaixo para visualizar um ranking rastreável.") +
      '<div class="workspace-grid"><div class="stack"><section class="card"><span class="method-icon">' + icon("info") + '</span><h2>Faltam algumas informações.</h2><p class="muted">A plataforma não presume comparações iguais nem preenche notas automaticamente.</p><ul class="insight-list">' + needed + '</ul><div class="button-row"><button class="button" data-action="view" data-view="' + (!analysis.model.ready ? "judgments" : "evaluations") + '">Continuar análise ' + icon("arrow") + '</button><button class="button secondary" data-action="view" data-view="structure">Revisar estrutura</button></div></section></div>' + statusSide(item, analysis) + '</div>';
  }
  const ranking = analysis.ranking;
  const model = analysis.model;
  const gap = ranking.length > 1 ? ranking[0].score - ranking[1].score : 0;
  const sensitivityRows = sensitivity(item, model.weights, analysis.normalized);
  const method = item.method === "anp" ? (model.local.some(group => group.fuzzy) ? "ANP com prioridades locais fuzzy defuzzificadas + pontuação aditiva" : "ANP de um grupo de critérios + pontuação aditiva") : model.fuzzy ? "AHP fuzzy por média geométrica triangular, centroide normalizado + pontuação aditiva" : "Pesos AHP por autovetor + pontuação aditiva";
  const nextStep = item.guided ? '<section class="guided-finish"><div><span class="eyebrow">EXEMPLO CONCLUÍDO</span><h2>Agora monte uma decisão sua.</h2><p>Comece com objetivo, critérios e alternativas vazios. Você escolhe o método e preenche cada julgamento e dado de desempenho.</p></div><button class="button" data-action="new">Criar minha análise do zero ' + icon("arrow") + '</button></section>' : "";
  const details = item.method === "anp" ?
    '<section class="card"><div class="card-head"><div><h3>Supermatriz de influências</h3><p>As colunas descrevem prioridades locais dos influenciadores; o vetor de pesos é seu limite.</p></div></div>' + matrixTable(item.criteria.map(c => c.id), model.matrix, item, "Supermatriz ponderada", "Cada coluna soma 1; os valores representam influência local.") + '<p class="field-hint" style="margin:12px 0 0">Modelo ANP de um grupo. ' + (model.local.some(group => group.fuzzy) ? "Faixas fuzzy foram aplicadas às comparações locais; seus centroides normalizados formaram as colunas da supermatriz. O resultado final é pontual, sem intervalo fuzzy global. " : "") + 'A rede deve ser fortemente conectada e conter autoinfluência para garantir a convergência.</p></section>' :
    (model.fuzzy ? '<section class="card"><div class="card-head"><div><h3>Pesos fuzzy dos critérios</h3><p>Média geométrica de números triangulares; o ranking usa os centroides normalizados.</p></div></div><div class="table-scroll"><table class="matrix-table"><thead><tr><th>Critério</th><th>Inferior</th><th>Central</th><th>Superior</th><th>Usado no ranking</th></tr></thead><tbody>' + item.criteria.map((c, i) => '<tr><th>' + escapeHtml(c.name) + '</th><td>' + pct(model.fuzzy.triangles[i].l, 1) + '</td><td>' + pct(model.fuzzy.triangles[i].m, 1) + '</td><td>' + pct(model.fuzzy.triangles[i].u, 1) + '</td><td><strong>' + pct(model.weights[i], 1) + '</strong></td></tr>').join("") + '</tbody></table></div><p class="field-hint" style="margin:13px 0 0">Os limites vêm da aritmética fuzzy triangular e não são intervalos de confiança ou probabilidades. O CR é calculado apenas na matriz de valores centrais.</p></section>' :
    '<section class="card"><div class="card-head"><div><h3>Comparação de técnicas de pesos</h3><p>Autovetor e média geométrica aplicados à mesma matriz de critérios.</p></div></div><div class="table-scroll"><table class="matrix-table"><thead><tr><th>Técnica</th>' + item.criteria.map(c => '<th>' + escapeHtml(c.name) + '</th>').join("") + '</tr></thead><tbody><tr><th>Autovetor</th>' + model.weights.map(w => '<td>' + pct(w, 1) + '</td>').join("") + '</tr><tr><th>Média geométrica</th>' + model.geometricWeights.map(w => '<td>' + pct(w, 1) + '</td>').join("") + '</tr></tbody></table></div></section>');
  return pageHead(item, "ETAPA 05 DE 05 · INTERPRETAÇÃO", "Uma decisão, com contexto.", "Explore o ranking, a qualidade dos julgamentos e a sensibilidade dos pesos.", '<button class="button secondary" data-action="export-csv">' + icon("download") + ' CSV</button><button class="button" data-action="print">' + icon("download") + ' Relatório</button>') +
    '<div class="print-only"><h1>DecisionLab · ' + escapeHtml(item.title) + '</h1><p>' + escapeHtml(item.objective) + '</p></div>' +
    '<div class="workspace-grid"><div class="stack"><section class="winner"><span class="eyebrow">ALTERNATIVA COM MAIOR PONTUAÇÃO</span><h2>' + escapeHtml(ranking[0].name) + '</h2><div class="winner-score">' + pct(ranking[0].score, 1) + '</div><p>Diferença para a segunda opção: ' + pct(gap, 1) + '. ' + (gap < 0.05 ? "Resultado próximo: examine a sensibilidade antes de decidir." : "Confira abaixo quais critérios sustentam essa posição.") + '</p></section>' +
    '<div class="metric-grid"><div class="metric"><span>Método</span><strong style="font-size:14px">' + escapeHtml(methodName(item)) + '</strong></div><div class="metric"><span>Critérios</span><strong>' + item.criteria.length + '</strong></div><div class="metric"><span>Alternativas</span><strong>' + item.alternatives.length + '</strong></div></div>' +
    '<section class="card"><div class="card-head"><div><h3>Ranking das alternativas</h3><p>Pontuação ponderada de 0 a 100%.</p></div></div>' + scoreBars(ranking) + '</section>' + nextStep +
    '<section class="card"><div class="card-head"><div><h3>Pesos dos critérios</h3><p>Prioridades derivadas dos julgamentos registrados.</p></div></div>' + weightBars(item, model.weights) + '</section>' +
    '<section class="card"><div class="card-head"><div><h3>Consistência</h3><p>Verifique a coerência de cada matriz de comparações.</p></div></div>' + resultConsistency(item, model) + '</section>' +
    '<section class="card"><div class="card-head"><div><h3>Análise de sensibilidade</h3><p>Variação de um peso final por vez, redistribuindo proporcionalmente os demais.</p></div></div><div class="step-list">' + sensitivityRows.map(row => '<div class="step"><span class="step-number">' + icon("chart") + '</span><strong>' + escapeHtml(criterionName(item, row.criterionId)) + '</strong><span style="margin-left:auto;text-align:right">' + pct(row.current, 1) + ' → ' + (row.threshold === null ? "sem troca de vencedor" : "troca perto de " + pct(row.threshold, 1)) + '</span></div>').join("") + '</div><p class="field-hint" style="margin:15px 0 0">Este é um cenário sobre os pesos finais, não uma nova execução dos julgamentos AHP/ANP.</p></section>' +
    details +
    '<section class="card"><div class="card-head"><div><h3>Como este resultado foi produzido</h3></div></div><ul class="insight-list"><li>' + escapeHtml(method) + '.</li><li>' + (item.evaluationMode === "score" ? "Notas de 0 a 10, nas quais 10 significa melhor desempenho." : "Valores brutos normalizados por mínimo e máximo em cada critério, respeitando custo ou benefício.") + '</li><li>Julgamentos recíprocos na escala de 1 a 9; pares sem resposta impedem o cálculo.</li><li>Ranking obtido pela soma dos desempenhos normalizados multiplicados pelos pesos.</li></ul></section>' +
    '</div><aside class="stack"><section class="card"><span class="eyebrow">LEITURA DO RESULTADO</span><h3 style="margin-top:9px">Por que ' + escapeHtml(ranking[0].name) + '?</h3><p class="small muted">Estas são as contribuições ponderadas da alternativa líder:</p>' + item.criteria.map((c, i) => '<div class="progress-line" style="margin-top:10px"><span>' + escapeHtml(c.name) + '</span><strong>' + pct(ranking[0].contributions[i], 1) + '</strong></div>').join("") + '</section><section class="card"><h3>Registro da análise</h3><p class="small muted"><strong>Objetivo:</strong> ' + escapeHtml(item.objective || "Não informado") + '</p><p class="small muted"><strong>Atualizada:</strong> ' + date(item.updatedAt) + '</p><div class="divider"></div><button class="button secondary" data-action="export-json">' + icon("download") + ' Exportar dados</button></section></aside></div>';
}
function reportBody(item) {
  const analysis = analyses(item);
  if (!analysis.ranking) return "";
  const model = analysis.model;
  const method = methodName(item);
  const consistencyRows = item.method === "ahp"
    ? '<tr><td>Matriz de critérios</td><td>' + (model.consistency.available ? pct(model.consistency.cr, 1) : "Indisponível") + '</td><td>' + (!model.consistency.available ? "Não calculado" : model.consistency.acceptable ? "Dentro do limite" : "Revisar julgamentos") + '</td></tr>'
    : model.local.map(group => '<tr><td>' + escapeHtml(criterionName(item, group.target)) + '</td><td>' + (group.consistency.available ? pct(group.consistency.cr, 1) : "Indisponível") + '</td><td>' + (!group.consistency.available ? "Não calculado" : group.consistency.acceptable ? "Dentro do limite" : "Revisar julgamentos") + '</td></tr>').join("");
  const performanceRows = item.alternatives.map(alternative => '<tr><td>' + escapeHtml(alternative.name) + '</td>' + item.criteria.map(criterion => '<td>' + escapeHtml(item.evaluations[alternative.id]?.[criterion.id] ?? "—") + '</td>').join("") + '</tr>').join("");
  const sensitivityRows = sensitivity(item, model.weights, analysis.normalized).map(row => '<tr><td>' + escapeHtml(criterionName(item, row.criterionId)) + '</td><td>' + pct(row.current, 1) + '</td><td>' + (row.threshold === null ? "Sem troca de vencedor" : "Troca perto de " + pct(row.threshold, 1)) + '</td></tr>').join("");
  return '<div class="report-document"><div class="report-kicker">DECISIONLAB / RELATÓRIO DA ANÁLISE</div><h1>' + escapeHtml(item.title) + '</h1><p class="report-objective">' + escapeHtml(item.objective || "Objetivo não informado") + '</p><div class="report-meta"><span>Atualizado em ' + date(item.updatedAt) + '</span><span>' + escapeHtml(method) + '</span><span>' + item.criteria.length + ' critérios · ' + item.alternatives.length + ' alternativas</span></div>' +
    '<section class="report-highlight"><small>ALTERNATIVA COM MAIOR PONTUAÇÃO</small><strong>' + escapeHtml(analysis.ranking[0].name) + '</strong><b>' + pct(analysis.ranking[0].score, 1) + '</b></section>' +
    '<section><h2>Ranking</h2><table><thead><tr><th>Posição</th><th>Alternativa</th><th>Pontuação</th></tr></thead><tbody>' + analysis.ranking.map((row, i) => '<tr><td>' + (i + 1) + 'º</td><td>' + escapeHtml(row.name) + '</td><td>' + pct(row.score, 1) + '</td></tr>').join("") + '</tbody></table></section>' +
    '<section><h2>Pesos dos critérios</h2><table><thead><tr><th>Critério</th><th>Tipo</th><th>Peso</th></tr></thead><tbody>' + item.criteria.map((criterion, i) => '<tr><td>' + escapeHtml(criterion.name) + '</td><td>' + (criterion.type === "cost" ? "Custo" : "Benefício") + '</td><td>' + pct(model.weights[i], 1) + '</td></tr>').join("") + '</tbody></table></section>' +
    '<section><h2>Dados de desempenho</h2><div class="report-table-scroll"><table><thead><tr><th>Alternativa</th>' + item.criteria.map(criterion => '<th>' + escapeHtml(criterion.name) + (criterion.unit ? ' (' + escapeHtml(criterion.unit) + ')' : '') + '</th>').join("") + '</tr></thead><tbody>' + performanceRows + '</tbody></table></div></section>' +
    '<section><h2>Consistência dos julgamentos</h2><table><thead><tr><th>Conjunto</th><th>CR</th><th>Leitura</th></tr></thead><tbody>' + consistencyRows + '</tbody></table><p>O CR usa os valores centrais quando há julgamentos fuzzy. O limite de referência é 10%.</p></section>' +
    '<section><h2>Sensibilidade</h2><table><thead><tr><th>Critério</th><th>Peso atual</th><th>Mudança de vencedor</th></tr></thead><tbody>' + sensitivityRows + '</tbody></table><p>Cada cenário varia um peso final e redistribui proporcionalmente os demais.</p></section>' +
    '<section><h2>Como o resultado foi calculado</h2><p>' + escapeHtml(item.method === "anp" ? "Rede ANP de um grupo de critérios: as prioridades locais formam a supermatriz, cujo vetor limite define os pesos." : "AHP: as comparações par a par definem os pesos dos critérios.") + ' ' + escapeHtml(item.evaluationMode === "score" ? "As notas de 0 a 10 são divididas por 10 e combinadas com os pesos." : "As medidas são normalizadas por mínimo e máximo em cada critério; critérios de custo favorecem o menor valor.") + ' O ranking é a soma ponderada dos desempenhos normalizados.</p></section><footer>DecisionLab · Relatório gerado a partir dos dados desta análise.</footer></div>';
}
function reportModal(item) {
  return '<div class="report-overlay" role="dialog" aria-modal="true" aria-label="Relatório da análise"><div class="report-panel"><div class="report-toolbar"><strong>Relatório pronto</strong><div><button type="button" class="button secondary" data-action="report-close">Voltar</button><button type="button" class="button secondary" data-action="report-download">Baixar HTML</button><button type="button" class="button" data-action="print-now">Imprimir / salvar PDF</button></div></div>' + reportBody(item) + '</div></div>';
}
function reportHtml(item) {
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Relatório DecisionLab · ' + escapeHtml(item.title) + '</title><style>body{font:14px Arial,sans-serif;color:#202b35;background:#f0ece1;margin:0;padding:32px}.report-document{max-width:900px;margin:auto;background:#fff;padding:46px;box-shadow:0 12px 34px #0002}.report-kicker{font-size:11px;letter-spacing:2px;color:#3166b6;font-weight:bold}h1{font-size:34px;margin:14px 0}h2{font-size:19px;margin:0 0 12px}p{line-height:1.5}.report-objective{color:#59636c}.report-meta{display:flex;gap:18px;flex-wrap:wrap;border-top:1px solid #bbc2c9;border-bottom:1px solid #bbc2c9;padding:12px 0;margin:25px 0;font-size:12px}.report-highlight{background:#202b35;color:#fff;padding:22px;display:flex;gap:14px;align-items:baseline;flex-wrap:wrap}.report-highlight small{width:100%;font-size:10px;letter-spacing:1px}.report-highlight strong{font-size:23px}.report-highlight b{font-size:22px;margin-left:auto;color:#f4c46b}section{margin:28px 0;break-inside:avoid}table{border-collapse:collapse;width:100%;font-size:13px}th,td{padding:9px;border-bottom:1px solid #d9dde0;text-align:left}th{background:#f2f4f6}.report-table-scroll{overflow:auto}footer{border-top:1px solid #bbc2c9;padding-top:14px;color:#69747d;font-size:11px}@media print{body{background:#fff;padding:0}.report-document{box-shadow:none;padding:0}@page{margin:16mm}}</style></head><body>' + reportBody(item) + '</body></html>';
}
function render() {
  const item = project();
  if (!item) { state.projectId = null; state.view = "home"; state.reportOpen = false; root.innerHTML = shell(home()); return; }
  const views = { overview, structure, judgments: guidedJudgments, evaluations, results };
  if (!views[state.view]) state.view = "overview";
  if (state.view !== "results") state.reportOpen = false;
  root.innerHTML = shell(views[state.view](item) + (state.reportOpen && state.view === "results" && analyses(item).ranking ? reportModal(item) : ""));
  if (state.view === "structure" && item.method === "anp") requestAnimationFrame(drawNetworkEdges);
}
window.addEventListener("resize", drawNetworkEdges);
function download(filename, contents, type) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  setTimeout(() => { anchor.remove(); URL.revokeObjectURL(url); }, 60000);
}
function filename(item) { return (item.title || "analise").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase(); }
function fieldUpdate(element) {
  const item = project();
  if (!item) return;
  const field = element.dataset.field;
  const id = element.dataset.id;
  if (item.guided && (field === "title" || field === "objective")) return;
  if (field === "title") item.title = element.value;
  else if (field === "objective") item.objective = element.value;
  else if (field.startsWith("criterion-")) {
    const c = item.criteria.find(x => x.id === id);
    if (c) c[field.slice(10)] = element.value;
  } else if (field === "alternative-name") {
    const a = item.alternatives.find(x => x.id === id);
    if (a) a.name = element.value;
  }
  save();
}
root.addEventListener("input", event => {
  const element = event.target;
  if (element.dataset.field) fieldUpdate(element);
  if (element.dataset.eval !== undefined) {
    const item = project();
    if (!item) return;
    const alt = element.dataset.alt, criterion = element.dataset.criterion;
    item.evaluations[alt] ||= {};
    item.evaluations[alt][criterion] = element.value === "" ? null : Number(element.value);
    save();
  }
});
root.addEventListener("change", event => {
  const element = event.target;
  const item = project();
  if (element.dataset.fuzzyBound && item) {
    const context = activeJudgment(item);
    if (!context?.a || context.current === null) return;
    const fuzzyStore = item.method === "anp"
      ? (item.comparisons.fuzzyInfluence ||= {})[context.target] ||= {}
      : (item.comparisons.fuzzyBase ||= {});
    const triangle = fuzzyPairValue(fuzzyStore, context.a, context.b) || approximateTriangle(context.current);
    const bound = element.dataset.fuzzyBound;
    const value = Number(element.value);
    const changed = { ...triangle, [bound]: value };
    try {
      setFuzzyPairValue(fuzzyStore, context.a, context.b, changed);
      state.fuzzyCustomFor = (item.method === "anp" ? context.target + ":" : "") + pairKey(context.a, context.b);
      save(); render();
    } catch (error) { toast(error.message); render(); }
    return;
  }
  if (element.dataset.pair !== undefined && item) {
    const comparisons = element.dataset.kind === "anp" ?
      (item.comparisons.influence[element.dataset.target] ||= {}) : item.comparisons.base;
    setPairValue(comparisons, element.dataset.a, element.dataset.b, element.value);
    const fuzzyStore = element.dataset.kind === "anp" ? item.comparisons.fuzzyInfluence?.[element.dataset.target] : item.comparisons.fuzzyBase;
    if (fuzzyStore) delete fuzzyStore[pairKey(element.dataset.a, element.dataset.b)];
    save(); render(); return;
  }
  if (element.dataset.influence !== undefined && item) {
    const target = element.dataset.target, source = element.dataset.source;
    item.influences[target] ||= [];
    item.influences[target] = element.checked ?
      [...new Set([...item.influences[target], source])] : item.influences[target].filter(id => id !== source);
    save(); render(); return;
  }
  if (element.dataset.field || element.dataset.eval !== undefined) { render(); return; }
  if (element.id === "import-file" && element.files?.[0]) importProject(element.files[0]);
});
root.addEventListener("keydown", event => {
  if (event.key === "Escape" && state.reportOpen) { state.reportOpen = false; render(); return; }
  if (event.key !== "Enter") return;
  if (event.target.id === "new-criterion") { event.preventDefault(); addEntity("criterion"); }
  if (event.target.id === "new-alternative") { event.preventDefault(); addEntity("alternative"); }
});
function addEntity(kind) {
  const item = project();
  const input = document.querySelector(kind === "criterion" ? "#new-criterion" : "#new-alternative");
  const name = input?.value.trim();
  if (!item || !name) { toast("Digite um nome antes de adicionar."); return; }
  if (kind === "criterion") {
    if (item.criteria.length >= 10) { toast("Esta versão admite até 10 critérios."); return; }
    const id = uid();
    item.criteria.push({ id, name, type: "benefit", unit: "" });
    state.target = id;
    item.influences[id] = item.criteria.map(c => c.id);
    for (const target of Object.keys(item.influences)) item.influences[target] = [...new Set([...item.influences[target], id])];
  } else {
    if (item.alternatives.length >= 25) { toast("Esta versão admite até 25 alternativas."); return; }
    item.alternatives.push({ id: uid(), name });
  }
  save(); render();
}
async function importProject(file) {
  try {
    const input = JSON.parse(await file.text());
    const data = input?.project || input;
    const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
    if (!record(data) || !Array.isArray(data.criteria) || !Array.isArray(data.alternatives) || !record(data.comparisons) || !record(data.evaluations)) {
      throw new Error("Arquivo incompatível com o DecisionLab 2.0.");
    }
    if (data.criteria.length > 10 || data.alternatives.length > 25 ||
        [...data.criteria, ...data.alternatives].some(entity => !record(entity) || typeof entity.id !== "string" || !entity.id.trim() || typeof entity.name !== "string") ||
        new Set([...data.criteria, ...data.alternatives].map(entity => entity.id)).size !== data.criteria.length + data.alternatives.length) {
      throw new Error("O arquivo contém critérios ou alternativas inválidos.");
    }
    const criteria = data.criteria.map(criterion => ({ id: criterion.id, name: criterion.name, type: criterion.type === "cost" ? "cost" : "benefit", unit: String(criterion.unit || "") }));
    const alternatives = data.alternatives.map(alternative => ({ id: alternative.id, name: alternative.name }));
    const influences = Object.fromEntries(criteria.map(criterion => [criterion.id,
      (Array.isArray(data.influences?.[criterion.id]) ? data.influences[criterion.id] : []).filter(id => criteria.some(other => other.id === id))]));
    const evaluations = Object.fromEntries(alternatives.map(alternative => [alternative.id,
      record(data.evaluations[alternative.id]) ? data.evaluations[alternative.id] : {}]));
    const comparisons = data.comparisons;
    const item = {
      ...data, id: uid(), title: String(data.title || "Análise importada") + " (importada)",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      guided: false, exampleKey: null,
      method: data.method === "anp" ? "anp" : "ahp",
      evaluationMode: data.evaluationMode === "raw" ? "raw" : "score",
      objective: String(data.objective || ""), criteria, alternatives, influences, evaluations,
      comparisons: { base: record(comparisons.base) ? comparisons.base : {}, influence: record(comparisons.influence) ? comparisons.influence : {}, fuzzyBase: record(comparisons.fuzzyBase) ? comparisons.fuzzyBase : {}, fuzzyInfluence: record(comparisons.fuzzyInfluence) ? comparisons.fuzzyInfluence : {} },
    };
    state.projects.push(item); save(); selectProject(item.id); toast("Análise importada.");
  } catch (error) { toast(error.message || "Não foi possível importar este arquivo."); }
}
function activeJudgment(item) {
  const ids = item.criteria.map(c => c.id);
  const target = ids.includes(state.target) ? state.target : ids[0];
  const currentIds = item.method === "anp" ? ids.filter(id => (item.influences[target] || []).includes(id)) : ids;
  const comparisons = item.method === "anp" ? (item.comparisons.influence[target] ||= {}) : item.comparisons.base;
  const list = pairs(currentIds);
  const [a, b] = list[state.judgmentIndex] || [];
  return { ids, target, currentIds, comparisons, list, a, b, current: a ? pairValue(comparisons, a, b) : null };
}
function nextJudgment(item) {
  const context = activeJudgment(item);
  if (context.list.length && context.current === null) return;
  if (state.judgmentIndex < context.list.length - 1) {
    state.judgmentIndex++; state.fuzzyCustomFor = null; render(); return;
  }
  const anyMissing = context.list.findIndex(([a, b]) => pairValue(context.comparisons, a, b) === null);
  if (anyMissing >= 0) { state.judgmentIndex = anyMissing; state.fuzzyCustomFor = null; render(); return; }
  if (item.method === "anp") {
    const start = context.ids.indexOf(context.target);
    for (let offset = 1; offset < context.ids.length; offset++) {
      const target = context.ids[(start + offset) % context.ids.length];
      const incoming = context.ids.filter(id => (item.influences[target] || []).includes(id));
      const list = pairs(incoming);
      const comparisons = item.comparisons.influence[target] || {};
      const missing = list.findIndex(([a, b]) => pairValue(comparisons, a, b) === null);
      if (missing >= 0) { state.target = target; state.judgmentIndex = missing; state.fuzzyCustomFor = null; render(); return; }
    }
    const network = networkStatus(context.ids, item.influences);
    if (!network.valid) { toast(network.reason); state.view = "structure"; render(); return; }
  }
  state.view = "evaluations"; state.fuzzyCustomFor = null; render(); window.scrollTo(0, 0);
}
root.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  event.preventDefault();
  const action = button.dataset.action;
  const item = project();
  if (action === "toggle-nav") {
    const open = document.querySelector(".analysis-shell .sidebar")?.classList.toggle("nav-open");
    button.setAttribute("aria-expanded", String(Boolean(open)));
  }
  else if (action === "home") { state.projectId = null; state.view = "home"; render(); window.scrollTo(0, 0); }
  else if (action === "new") {
    const created = defaultProject();
    state.projects.push(created); save(); selectProject(created.id); window.scrollTo(0, 0);
  }
  else if (action === "demo" || action === "example") {
    const exampleKey = EXAMPLES.some(value => value.key === button.dataset.example) ? button.dataset.example : EXAMPLES[0].key;
    const existing = [...state.projects].reverse().find(value => value.guided && value.exampleKey === exampleKey && !analyses(value).ranking);
    if (existing) selectProject(existing.id);
    else { const created = demoProject(exampleKey); state.projects.push(created); save(); selectProject(created.id); }
    window.scrollTo(0, 0);
  }
  else if (action === "open") { selectProject(button.dataset.id); window.scrollTo(0, 0); }
  else if (action === "duplicate") {
    const source = state.projects.find(value => value.id === button.dataset.id);
    if (!source) return;
    const copy = JSON.parse(JSON.stringify(source));
    copy.id = uid(); copy.title += " (cópia)";
    copy.guided = false; copy.exampleKey = null;
    copy.createdAt = new Date().toISOString(); copy.updatedAt = copy.createdAt;
    state.projects.push(copy); save(); render(); toast("Análise duplicada.");
  }
  else if (action === "delete") {
    const source = state.projects.find(value => value.id === button.dataset.id);
    if (!source || !window.confirm('Excluir "' + source.title + '" deste navegador? Exporte o JSON antes se quiser guardar uma cópia.')) return;
    state.projects = state.projects.filter(value => value.id !== source.id);
    save(); render(); toast("Análise excluída.");
  }
  else if (action === "view") { state.view = button.dataset.view; render(); window.scrollTo(0, 0); }
  else if (action === "target") { state.target = button.dataset.id; state.judgmentIndex = 0; state.fuzzyCustomFor = null; render(); }
  else if (action === "focus-add-criterion") { document.querySelector("#new-criterion")?.focus(); document.querySelector("#new-criterion")?.scrollIntoView({ block: "center", behavior: "smooth" }); }
  else if (action === "edit-alternative") {
    const input = [...document.querySelectorAll('[data-field="alternative-name"]')].find(element => element.dataset.id === button.dataset.id);
    input?.focus(); input?.scrollIntoView({ block: "center", behavior: "smooth" });
  }
  else if ((action === "set-side" || action === "set-intensity") && item) {
    const context = activeJudgment(item);
    if (!context.a) return;
    let ratio;
    if (action === "set-side") {
      const strength = context.current === null || closeNumber(context.current, 1) ? 2 : Math.round(Math.max(context.current, 1 / context.current));
      ratio = button.dataset.side === "left" ? strength : 1 / strength;
    } else {
      const strength = Number(button.dataset.value);
      if (context.current === null && strength !== 1) return;
      ratio = strength === 1 ? 1 : context.current < 1 ? 1 / strength : strength;
    }
    setPairValue(context.comparisons, context.a, context.b, ratio);
    if (context.current === null || !closeNumber(context.current, ratio)) {
      const fuzzyStore = item.method === "anp" ? item.comparisons.fuzzyInfluence?.[context.target] : item.comparisons.fuzzyBase;
      if (fuzzyStore) delete fuzzyStore[pairKey(context.a, context.b)];
    }
    state.fuzzyCustomFor = null; save(); render();
  }
  else if (action === "judgment-prev") { state.judgmentIndex = Math.max(0, state.judgmentIndex - 1); state.fuzzyCustomFor = null; render(); }
  else if (action === "judgment-next" && item) nextJudgment(item);
  else if (action === "judgment-jump") { state.judgmentIndex = Number(button.dataset.index); state.fuzzyCustomFor = null; render(); }
  else if (action === "fuzzy-mode" && item) {
    const context = activeJudgment(item);
    if (!context.a || context.current === null) return;
    const key = pairKey(context.a, context.b);
    const fuzzyStore = item.method === "anp"
      ? (item.comparisons.fuzzyInfluence ||= {})[context.target] ||= {}
      : (item.comparisons.fuzzyBase ||= {});
    const stateKey = (item.method === "anp" ? context.target + ":" : "") + key;
    if (button.dataset.mode === "exact") {
      delete fuzzyStore[key]; state.fuzzyCustomFor = null;
    } else if (button.dataset.mode === "approx") {
      setFuzzyPairValue(fuzzyStore, context.a, context.b, approximateTriangle(context.current));
      state.fuzzyCustomFor = null;
    } else {
      if (!fuzzyPairValue(fuzzyStore, context.a, context.b))
        setFuzzyPairValue(fuzzyStore, context.a, context.b, approximateTriangle(context.current));
      state.fuzzyCustomFor = stateKey;
    }
    save(); render();
  }
  else if (action === "method" && item) { item.method = button.dataset.method; state.target = item.criteria[0]?.id || null; save(); render(); }
  else if (action === "evaluation-mode" && item) { item.evaluationMode = button.dataset.mode; save(); render(); }
  else if (action === "add-criterion") addEntity("criterion");
  else if (action === "add-alternative") addEntity("alternative");
  else if (action === "remove-criterion" && item) {
    const id = button.dataset.id;
    item.criteria = item.criteria.filter(c => c.id !== id);
    delete item.influences[id];
    Object.keys(item.influences).forEach(key => { item.influences[key] = item.influences[key].filter(value => value !== id); });
    Object.keys(item.comparisons.base).forEach(key => { if (key.split("|").includes(id)) delete item.comparisons.base[key]; });
    Object.keys(item.comparisons.fuzzyBase || {}).forEach(key => { if (key.split("|").includes(id)) delete item.comparisons.fuzzyBase[key]; });
    Object.values(item.comparisons.influence).forEach(group => Object.keys(group).forEach(key => { if (key.split("|").includes(id)) delete group[key]; }));
    delete item.comparisons.influence[id];
    if (item.comparisons.fuzzyInfluence) {
      Object.values(item.comparisons.fuzzyInfluence).forEach(group => Object.keys(group).forEach(key => { if (key.split("|").includes(id)) delete group[key]; }));
      delete item.comparisons.fuzzyInfluence[id];
    }
    Object.values(item.evaluations).forEach(row => delete row[id]);
    if (state.target === id) state.target = item.criteria[0]?.id || null;
    save(); render();
  }
  else if (action === "remove-alternative" && item) {
    const id = button.dataset.id;
    item.alternatives = item.alternatives.filter(a => a.id !== id);
    delete item.evaluations[id]; save(); render();
  }
  else if (action === "export-json" && item) {
    download("decisionlab-" + filename(item) + ".json", JSON.stringify({ schemaVersion: 2, project: item }, null, 2), "application/json");
    toast("Arquivo JSON exportado.");
  }
  else if (action === "export-csv" && item) {
    const result = analyses(item);
    if (!result.ranking) { toast("Complete a análise antes de exportar o ranking."); return; }
    const quote = value => '"' + String(value).replaceAll('"', '""') + '"';
    const rows = [["Posição", "Alternativa", "Pontuação (%)"], ...result.ranking.map((r, i) => [i + 1, r.name, (r.score * 100).toFixed(2).replace(".", ",")])];
    download("decisionlab-" + filename(item) + "-ranking.csv", "\uFEFF" + rows.map(row => row.map(quote).join(";")).join("\r\n"), "text/csv");
    toast("Ranking CSV exportado.");
  }
  else if (action === "import") document.querySelector("#import-file")?.click();
  else if (action === "print" && item) { state.reportOpen = true; render(); }
  else if (action === "report-close") { state.reportOpen = false; render(); }
  else if (action === "report-download" && item) {
    download("decisionlab-" + filename(item) + "-relatorio.html", reportHtml(item), "text/html;charset=utf-8");
    toast("Relatório HTML exportado.");
  }
  else if (action === "print-now") window.print();
});
render();
