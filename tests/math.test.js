import test from "node:test";
import assert from "node:assert/strict";
import {
  setPairValue, pairValue, setFuzzyPairValue, fuzzyPairValue, approximateTriangle,
  fuzzyGeometricWeights, ahpAnalysis, comparisonMatrix, principalEigenvector, consistency,
  networkStatus, anpAnalysis, normalizedEvaluations, rankAlternatives, sensitivity,
} from "../math.js";

test("comparações recíprocas e AHP perfeitamente consistente", () => {
  const comparisons = {};
  setPairValue(comparisons, "a", "b", 2);
  setPairValue(comparisons, "a", "c", 4);
  setPairValue(comparisons, "b", "c", 2);
  assert.equal(pairValue(comparisons, "b", "a"), 0.5);
  const matrix = comparisonMatrix(["a", "b", "c"], comparisons);
  const weights = principalEigenvector(matrix);
  weights.forEach((value, i) => assert.ok(Math.abs(value - [4 / 7, 2 / 7, 1 / 7][i]) < 1e-9));
  assert.ok(consistency(matrix, weights).cr < 1e-9);
});

test("julgamento fuzzy preserva reciprocidade e ordem triangular", () => {
  const fuzzy = {};
  setFuzzyPairValue(fuzzy, "a", "b", { l: 2, m: 3, u: 4 });
  assert.deepEqual(fuzzyPairValue(fuzzy, "b", "a"), { l: 1 / 4, m: 1 / 3, u: 1 / 2 });
  assert.deepEqual(approximateTriangle(1 / 3), { l: 1 / 4, m: 1 / 3, u: 1 / 2 });
  assert.throws(() => setFuzzyPairValue(fuzzy, "a", "b", { l: 4, m: 3, u: 2 }));
});

test("AHP fuzzy usa centroide normalizado e CR da matriz central", () => {
  const project = {
    criteria: [{ id: "a" }, { id: "b" }],
    comparisons: { base: {}, fuzzyBase: {} },
  };
  setPairValue(project.comparisons.base, "a", "b", 3);
  const crisp = ahpAnalysis(project);
  assert.equal(crisp.fuzzy, null);
  assert.ok(Math.abs(crisp.weights[0] - 0.75) < 1e-9);
  setFuzzyPairValue(project.comparisons.fuzzyBase, "a", "b", { l: 2, m: 3, u: 4 });
  const fuzzy = ahpAnalysis(project);
  assert.ok(fuzzy.fuzzy);
  assert.ok(fuzzy.weights[0] > fuzzy.weights[1]);
  assert.ok(Math.abs(fuzzy.weights[0] + fuzzy.weights[1] - 1) < 1e-9);
  assert.equal(fuzzy.consistency.cr, 0);
  assert.ok(fuzzy.fuzzy.triangles[0].l < fuzzy.fuzzy.triangles[0].m);
  assert.ok(fuzzy.fuzzy.triangles[0].m < fuzzy.fuzzy.triangles[0].u);
  const direct = fuzzyGeometricWeights(["a", "b"], project.comparisons.base, project.comparisons.fuzzyBase);
  assert.deepEqual(fuzzy.weights, direct.weights);
  setPairValue(project.comparisons.base, "a", "b", 4);
  assert.equal(ahpAnalysis(project).fuzzy, null);
});

test("ANP de um cluster converge para a prioridade limite esperada", () => {
  const project = {
    criteria: [{ id: "a" }, { id: "b" }],
    influences: { a: ["a", "b"], b: ["a", "b"] },
    comparisons: { influence: { a: {}, b: {} } },
  };
  setPairValue(project.comparisons.influence.a, "a", "b", 3);
  setPairValue(project.comparisons.influence.b, "a", "b", 1 / 3);
  const result = anpAnalysis(project);
  assert.equal(result.ready, true);
  assert.ok(Math.abs(result.weights[0] - 0.5) < 1e-9);
  assert.ok(Math.abs(result.weights[1] - 0.5) < 1e-9);
  assert.equal(networkStatus(["a", "b"], { a: ["a"], b: ["b"] }).valid, false);
});

test("ANP calcula um limite não uniforme a partir de comparações locais", () => {
  const project = {
    criteria: [{ id: "a" }, { id: "b" }],
    influences: { a: ["a", "b"], b: ["a", "b"] },
    comparisons: { influence: { a: {}, b: {} } },
  };
  setPairValue(project.comparisons.influence.a, "a", "b", 4);
  setPairValue(project.comparisons.influence.b, "a", "b", 3 / 7);
  const result = anpAnalysis(project);
  assert.equal(result.ready, true);
  assert.ok(Math.abs(result.weights[0] - 0.6) < 1e-8);
  assert.ok(Math.abs(result.weights[1] - 0.4) < 1e-8);
});

test("ANP usa julgamentos fuzzy nas prioridades locais e preserva a supermatriz estocástica", () => {
  const project = {
    criteria: [{ id: "a" }, { id: "b" }],
    influences: { a: ["a", "b"], b: ["a", "b"] },
    comparisons: { influence: { a: {}, b: {} }, fuzzyInfluence: { a: {} } },
  };
  setPairValue(project.comparisons.influence.a, "a", "b", 3);
  setPairValue(project.comparisons.influence.b, "a", "b", 1 / 3);
  const exact = anpAnalysis(project);
  setFuzzyPairValue(project.comparisons.fuzzyInfluence.a, "a", "b", { l: 2, m: 3, u: 9 });
  const fuzzy = anpAnalysis(project);
  assert.equal(fuzzy.ready, true);
  assert.ok(fuzzy.local[0].fuzzy);
  assert.equal(fuzzy.local[1].fuzzy, null);
  assert.ok(Math.abs(fuzzy.weights[0] - exact.weights[0]) > 1e-4);
  fuzzy.matrix[0].forEach((_, column) => {
    assert.ok(Math.abs(fuzzy.matrix.reduce((sum, row) => sum + row[column], 0) - 1) < 1e-10);
  });
  assert.equal(fuzzy.local[0].consistency.cr, 0);
});

test("exemplo de celular favorece o modelo equilibrado com pesos iguais", () => {
  const project = {
    criteria: [
      { id: "preco", type: "cost" },
      { id: "bateria", type: "benefit" },
      { id: "camera", type: "benefit" },
    ],
    alternatives: [
      { id: "lume", name: "Lume Lite" },
      { id: "nexo", name: "Nexo Plus" },
      { id: "prisma", name: "Prisma Pro" },
    ],
    evaluationMode: "raw",
    evaluations: {
      lume: { preco: 1800, bateria: 18, camera: 7 },
      nexo: { preco: 2600, bateria: 24, camera: 8 },
      prisma: { preco: 3800, bateria: 20, camera: 10 },
    },
  };
  const ranking = rankAlternatives(project, [1 / 3, 1 / 3, 1 / 3]);
  assert.equal(ranking[0].id, "nexo");
  assert.ok(ranking[0].score > ranking[1].score);
});

test("notas e valores brutos respeitam a interpretação do critério", () => {
  const project = {
    criteria: [{ id: "cost", type: "cost" }, { id: "quality", type: "benefit" }],
    alternatives: [{ id: "x", name: "X" }, { id: "y", name: "Y" }],
    evaluationMode: "raw",
    evaluations: { x: { cost: 10, quality: 8 }, y: { cost: 20, quality: 6 } },
  };
  assert.deepEqual(normalizedEvaluations(project), [[1, 1], [0, 0]]);
  assert.equal(rankAlternatives(project, [0.5, 0.5])[0].id, "x");
  project.evaluationMode = "score";
  project.evaluations.y.cost = 5;
  assert.deepEqual(normalizedEvaluations(project), [[1, 0.8], [0.5, 0.6]]);
});

test("sensibilidade identifica mudança de vencedor ao variar peso", () => {
  const project = {
    criteria: [{ id: "a", type: "benefit" }, { id: "b", type: "benefit" }],
    alternatives: [{ id: "x", name: "X" }, { id: "y", name: "Y" }],
    evaluationMode: "score",
    evaluations: { x: { a: 10, b: 0 }, y: { a: 0, b: 10 } },
  };
  const result = sensitivity(project, [0.7, 0.3]);
  assert.ok(Math.abs(result[0].threshold - 0.5) <= 0.01);
});
