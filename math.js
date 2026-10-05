// DecisionLab: deterministic, dependency-free decision calculations.
export const SAATY = [
  { value: 2, label: "Entre igual e moderada" },
  { value: 3, label: "Moderada" },
  { value: 4, label: "Entre moderada e forte" },
  { value: 5, label: "Forte" },
  { value: 6, label: "Entre forte e muito forte" },
  { value: 7, label: "Muito forte" },
  { value: 8, label: "Entre muito forte e extrema" },
  { value: 9, label: "Extrema" },
];

const RI = { 1: 0, 2: 0, 3: 0.58, 4: 0.9, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49 };
const EPS = 1e-12;

export function pairKey(a, b) {
  return [a, b].sort().join("|");
}

export function pairValue(comparisons, a, b) {
  const raw = Number(comparisons?.[pairKey(a, b)]);
  if (!Number.isFinite(raw) || raw <= 0) return null;
  return a < b ? raw : 1 / raw;
}

export function setPairValue(comparisons, a, b, leftOverRight) {
  const key = pairKey(a, b);
  if (leftOverRight === null || leftOverRight === "") {
    delete comparisons[key];
    return;
  }
  const value = Number(leftOverRight);
  if (!Number.isFinite(value) || value <= 0) throw new Error("Comparação inválida.");
  comparisons[key] = a < b ? value : 1 / value;
}

function validTriangle(triangle) {
  if (!triangle || typeof triangle !== "object") return false;
  const { l, m, u } = triangle;
  return [l, m, u].every(value => Number.isFinite(value) && value > 0) && l <= m && m <= u;
}

export function fuzzyPairValue(comparisons, a, b) {
  const stored = comparisons?.[pairKey(a, b)];
  if (!validTriangle(stored)) return null;
  return a < b ? { ...stored } : { l: 1 / stored.u, m: 1 / stored.m, u: 1 / stored.l };
}

export function setFuzzyPairValue(comparisons, a, b, triangle) {
  if (!validTriangle(triangle)) throw new Error("A faixa fuzzy deve obedecer a l ≤ m ≤ u.");
  comparisons[pairKey(a, b)] = a < b
    ? { ...triangle }
    : { l: 1 / triangle.u, m: 1 / triangle.m, u: 1 / triangle.l };
}

export function approximateTriangle(ratio) {
  if (!Number.isFinite(ratio) || ratio < 1 / 9 || ratio > 9) throw new Error("Intensidade fora da escala.");
  if (ratio === 1) return { l: 1 / 2, m: 1, u: 2 };
  if (ratio > 1) return { l: Math.max(1, ratio - 1), m: ratio, u: Math.min(9, ratio + 1) };
  const strength = 1 / ratio;
  return { l: 1 / Math.min(9, strength + 1), m: ratio, u: 1 / Math.max(1, strength - 1) };
}

export function fuzzyGeometricWeights(ids, crispComparisons, fuzzyComparisons = {}) {
  const matrix = comparisonMatrix(ids, crispComparisons);
  if (!matrix) return null;
  const n = ids.length;
  const rowMeans = ids.map((a, i) => {
    const row = ids.map((b, j) => {
      if (i === j) return { l: 1, m: 1, u: 1 };
      const fuzzy = fuzzyPairValue(fuzzyComparisons, a, b);
      return fuzzy && Math.abs(fuzzy.m - matrix[i][j]) < 1e-9
        ? fuzzy : { l: matrix[i][j], m: matrix[i][j], u: matrix[i][j] };
    });
    return {
      l: Math.exp(row.reduce((sum, v) => sum + Math.log(v.l), 0) / n),
      m: Math.exp(row.reduce((sum, v) => sum + Math.log(v.m), 0) / n),
      u: Math.exp(row.reduce((sum, v) => sum + Math.log(v.u), 0) / n),
    };
  });
  const sums = rowMeans.reduce((sum, row) => ({
    l: sum.l + row.l, m: sum.m + row.m, u: sum.u + row.u,
  }), { l: 0, m: 0, u: 0 });
  const triangles = rowMeans.map(row => ({
    l: row.l / sums.u,
    m: row.m / sums.m,
    u: row.u / sums.l,
  }));
  const weights = normalize(triangles.map(({ l, m, u }) => (l + m + u) / 3));
  return { triangles, weights };
}

export function pairs(ids) {
  const result = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) result.push([ids[i], ids[j]]);
  }
  return result;
}

export function comparisonProgress(ids, comparisons) {
  const all = pairs(ids);
  return {
    completed: all.filter(([a, b]) => pairValue(comparisons, a, b) !== null).length,
    total: all.length,
  };
}

export function comparisonMatrix(ids, comparisons) {
  const progress = comparisonProgress(ids, comparisons);
  if (progress.completed !== progress.total) return null;
  return ids.map(a => ids.map(b => a === b ? 1 : pairValue(comparisons, a, b)));
}

function normalize(vector) {
  const sum = vector.reduce((a, b) => a + b, 0);
  if (!Number.isFinite(sum) || sum <= 0) throw new Error("Não foi possível normalizar os pesos.");
  return vector.map(v => v / sum);
}

export function principalEigenvector(matrix) {
  const n = matrix.length;
  if (!n || matrix.some(row => row.length !== n || row.some(v => !Number.isFinite(v) || v <= 0))) {
    throw new Error("Matriz de comparação inválida.");
  }
  let vector = Array(n).fill(1 / n);
  for (let step = 0; step < 10000; step++) {
    const next = normalize(matrix.map(row => row.reduce((sum, value, j) => sum + value * vector[j], 0)));
    const change = next.reduce((sum, value, i) => sum + Math.abs(value - vector[i]), 0);
    vector = next;
    if (change < EPS) return vector;
  }
  throw new Error("O cálculo dos pesos não convergiu.");
}

export function geometricMeanWeights(matrix) {
  const n = matrix.length;
  if (!n) throw new Error("Matriz vazia.");
  return normalize(matrix.map(row => Math.exp(row.reduce((sum, value) => sum + Math.log(value), 0) / n)));
}

export function consistency(matrix, weights = principalEigenvector(matrix)) {
  const n = matrix.length;
  if (n <= 2) return { lambdaMax: n, ci: 0, cr: 0, acceptable: true, available: true };
  const aw = matrix.map(row => row.reduce((sum, value, j) => sum + value * weights[j], 0));
  const lambdaMax = aw.reduce((sum, value, i) => sum + value / weights[i], 0) / n;
  const ci = Math.max(0, (lambdaMax - n) / (n - 1));
  const ri = RI[n];
  if (ri === undefined) return { lambdaMax, ci, cr: null, acceptable: null, available: false };
  const cr = ci / ri;
  return { lambdaMax, ci, cr, acceptable: cr <= 0.1, available: true };
}

export function ahpAnalysis(project) {
  const ids = project.criteria.map(item => item.id);
  if (ids.length < 2) return { ready: false, reason: "Adicione pelo menos dois critérios." };
  const progress = comparisonProgress(ids, project.comparisons.base);
  if (progress.completed !== progress.total) return { ready: false, reason: "Complete as comparações dos critérios.", progress };
  const matrix = comparisonMatrix(ids, project.comparisons.base);
  const eigenWeights = principalEigenvector(matrix);
  const fuzzyComparisons = project.comparisons.fuzzyBase || {};
  const fuzzyUsed = pairs(ids).some(([a, b]) => {
    const triangle = fuzzyPairValue(fuzzyComparisons, a, b);
    const modal = pairValue(project.comparisons.base, a, b);
    return triangle && Math.abs(triangle.m - modal) < 1e-9 &&
      (triangle.l < triangle.m || triangle.m < triangle.u);
  });
  const fuzzy = fuzzyUsed ? fuzzyGeometricWeights(ids, project.comparisons.base, fuzzyComparisons) : null;
  return {
    ready: true,
    weights: fuzzy ? fuzzy.weights : eigenWeights,
    matrix,
    consistency: consistency(matrix, eigenWeights),
    eigenWeights,
    geometricWeights: geometricMeanWeights(matrix),
    fuzzy,
  };
}

export function networkStatus(criteriaIds, influences) {
  if (criteriaIds.length < 2) return { valid: false, reason: "Adicione pelo menos dois critérios." };
  const idSet = new Set(criteriaIds);
  for (const target of criteriaIds) {
    const incoming = (influences[target] || []).filter(id => idSet.has(id));
    if (!incoming.length) return { valid: false, reason: "Cada critério precisa receber ao menos uma influência." };
  }
  // Edges run from an influencing criterion to its target.
  const reach = start => {
    const seen = new Set([start]);
    const queue = [start];
    while (queue.length) {
      const source = queue.shift();
      for (const target of criteriaIds) {
        if ((influences[target] || []).includes(source) && !seen.has(target)) {
          seen.add(target);
          queue.push(target);
        }
      }
    }
    return seen.size === criteriaIds.length;
  };
  if (!criteriaIds.every(reach)) return {
    valid: false,
    reason: "A rede precisa conectar todos os critérios por caminhos de influência nos dois sentidos.",
  };
  if (!criteriaIds.some(id => (influences[id] || []).includes(id))) return {
    valid: false,
    reason: "Inclua ao menos uma autoinfluência para evitar uma rede periódica.",
  };
  return { valid: true, reason: "" };
}

export function anpAnalysis(project) {
  const ids = project.criteria.map(item => item.id);
  const status = networkStatus(ids, project.influences);
  if (!status.valid) return { ready: false, reason: status.reason };
  const matrix = ids.map(() => Array(ids.length).fill(0));
  const local = [];
  for (let column = 0; column < ids.length; column++) {
    const target = ids[column];
    const influencers = ids.filter(id => (project.influences[target] || []).includes(id));
    const comparisons = project.comparisons.influence[target] || {};
    const fuzzyComparisons = project.comparisons.fuzzyInfluence?.[target] || {};
    const progress = comparisonProgress(influencers, comparisons);
    if (progress.completed !== progress.total) return {
      ready: false,
      reason: "Complete as comparações de influência.",
      target,
      progress,
    };
    const localMatrix = comparisonMatrix(influencers, comparisons);
    const modalWeights = localMatrix ? principalEigenvector(localMatrix) : [1];
    const fuzzyUsed = pairs(influencers).some(([a, b]) => {
      const triangle = fuzzyPairValue(fuzzyComparisons, a, b);
      const modal = pairValue(comparisons, a, b);
      return triangle && modal !== null && Math.abs(triangle.m - modal) < 1e-9 &&
        (triangle.l < triangle.m || triangle.m < triangle.u);
    });
    const fuzzy = fuzzyUsed ? fuzzyGeometricWeights(influencers, comparisons, fuzzyComparisons) : null;
    const weights = fuzzy ? fuzzy.weights : modalWeights;
    const check = localMatrix ? consistency(localMatrix, modalWeights) : {
      cr: 0, acceptable: true, available: true,
    };
    influencers.forEach((id, k) => { matrix[ids.indexOf(id)][column] = weights[k]; });
    local.push({ target, influencers, weights, consistency: check, fuzzy });
  }
  // A one-cluster ANP supermatrix is column-stochastic. Strong connectivity
  // and a self-loop make its limit unique and aperiodic.
  let vector = Array(ids.length).fill(1 / ids.length);
  let converged = false;
  for (let step = 0; step < 10000; step++) {
    const next = matrix.map(row => row.reduce((sum, value, j) => sum + value * vector[j], 0));
    const change = next.reduce((sum, value, i) => sum + Math.abs(value - vector[i]), 0);
    vector = next;
    if (change < EPS) { converged = true; break; }
  }
  if (!converged) return { ready: false, reason: "A supermatriz não convergiu. Revise a rede." };
  return { ready: true, weights: normalize(vector), matrix, local };
}

export function evaluationStatus(project) {
  const cells = project.alternatives.flatMap(a => project.criteria.map(c => project.evaluations?.[a.id]?.[c.id]));
  const completed = cells.filter(value => value !== "" && value !== null && value !== undefined &&
    Number.isFinite(Number(value)) && (project.evaluationMode !== "score" || (Number(value) >= 0 && Number(value) <= 10))).length;
  return { completed, total: cells.length, ready: project.alternatives.length >= 2 && project.criteria.length >= 2 && completed === cells.length };
}

export function normalizedEvaluations(project) {
  const status = evaluationStatus(project);
  if (!status.ready) return null;
  const values = project.alternatives.map(a => project.criteria.map(c => Number(project.evaluations[a.id][c.id])));
  if (project.evaluationMode === "score") return values.map(row => row.map(value => value / 10));
  return values.map((row, i) => row.map((value, j) => {
    const column = values.map(item => item[j]);
    const min = Math.min(...column);
    const max = Math.max(...column);
    if (max === min) return 1;
    return project.criteria[j].type === "cost" ? (max - value) / (max - min) : (value - min) / (max - min);
  }));
}

export function rankAlternatives(project, weights, normalized = normalizedEvaluations(project)) {
  if (!normalized) return null;
  return project.alternatives.map((alternative, i) => ({
    id: alternative.id,
    name: alternative.name,
    score: normalized[i].reduce((sum, value, j) => sum + value * weights[j], 0),
    contributions: normalized[i].map((value, j) => value * weights[j]),
  })).sort((a, b) => b.score - a.score);
}

export function sensitivity(project, weights, normalized = normalizedEvaluations(project)) {
  if (!normalized) return [];
  const original = rankAlternatives(project, weights, normalized)[0]?.id;
  return weights.map((current, criterionIndex) => {
    let closest = null;
    for (let k = 0; k <= 200; k++) {
      const tested = k / 200;
      const rest = 1 - current;
      const adjusted = weights.map((w, i) => i === criterionIndex ? tested :
        rest < EPS ? (1 - tested) / (weights.length - 1) : w * (1 - tested) / rest);
      const winner = rankAlternatives(project, adjusted, normalized)[0]?.id;
      if (winner !== original && (closest === null || Math.abs(tested - current) < Math.abs(closest - current))) closest = tested;
    }
    return { criterionId: project.criteria[criterionIndex].id, current, threshold: closest };
  });
}
