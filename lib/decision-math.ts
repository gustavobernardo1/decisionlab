import { 
  Matrix, 
  FuzzyMatrix, 
  FuzzyNumber, 
  ConsistencyResult, 
  MethodResult,
  MethodType,
  Criterion,
  Alternative,
  RI,
  FUZZY_SCALE,
  METHOD_NAMES
} from './decision-types';

// Helper: normalize vector to sum to 1
function normalizeVector(vec: number[]): number[] {
  const sum = vec.reduce((a, b) => a + b, 0);
  if (sum === 0) return vec.map(() => 1 / vec.length);
  return vec.map(v => v / sum);
}

// Helper: matrix-vector multiplication
function matrixVectorMultiply(matrix: Matrix, vector: number[]): number[] {
  return matrix.map(row => 
    row.reduce((sum, val, i) => sum + val * vector[i], 0)
  );
}

// ============================================
// 1. Build reciprocal matrix from comparisons
// ============================================
export function buildReciprocalMatrix(n: number, comparisons: Map<string, number>): Matrix {
  const matrix: Matrix = Array(n).fill(null).map(() => Array(n).fill(1));
  
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const key = `${i}-${j}`;
      const value = comparisons.get(key) ?? 1;
      matrix[i][j] = value;
      matrix[j][i] = 1 / value;
    }
  }
  
  return matrix;
}

export function buildFuzzyMatrix(n: number, comparisons: Map<string, number>): FuzzyMatrix {
  const matrix: FuzzyMatrix = Array(n).fill(null).map(() => 
    Array(n).fill(null).map(() => ({ l: 1, m: 1, u: 1 }))
  );
  
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const key = `${i}-${j}`;
      const value = comparisons.get(key) ?? 1;
      
      const absValue = Math.abs(value);
      const fuzzy = FUZZY_SCALE[Math.round(absValue)] ?? { l: 1, m: 1, u: 1 };
      
      if (value >= 1) {
        matrix[i][j] = fuzzy;
        matrix[j][i] = { l: 1/fuzzy.u, m: 1/fuzzy.m, u: 1/fuzzy.l };
      } else {
        matrix[i][j] = { l: 1/fuzzy.u, m: 1/fuzzy.m, u: 1/fuzzy.l };
        matrix[j][i] = fuzzy;
      }
    }
  }
  
  return matrix;
}

// ============================================
// 2. Eigenvector method (Power Iteration)
// ============================================
export function eigenvectorMethod(matrix: Matrix): number[] {
  const n = matrix.length;
  let vector = Array(n).fill(1 / n);
  const maxIterations = 100;
  const tolerance = 1e-8;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    const newVector = matrixVectorMultiply(matrix, vector);
    const normalized = normalizeVector(newVector);
    
    // Check convergence
    const diff = normalized.reduce((sum, v, i) => sum + Math.abs(v - vector[i]), 0);
    if (diff < tolerance) break;
    
    vector = normalized;
  }
  
  return vector;
}

// ============================================
// 3. Geometric Mean method
// ============================================
export function geometricMeanMethod(matrix: Matrix): number[] {
  const n = matrix.length;
  const gm = matrix.map(row => {
    const product = row.reduce((prod, val) => prod * val, 1);
    return Math.pow(product, 1 / n);
  });
  
  return normalizeVector(gm);
}

// ============================================
// 4. Linear Programming approximation
// ============================================
export function linearProgrammingMethod(matrix: Matrix): { 
  weights: number[], 
  feasibilityScore: number, 
  satisfiedConstraints: number, 
  totalConstraints: number 
} {
  const n = matrix.length;
  const totalConstraints = (n * (n - 1)) / 2;
  
  // Generate candidate weight vectors
  const candidates: number[][] = [];
  
  // Start with eigenvector and geometric mean as initial candidates
  candidates.push(eigenvectorMethod(matrix));
  candidates.push(geometricMeanMethod(matrix));
  
  // Generate random candidates
  for (let i = 0; i < 50; i++) {
    const candidate = Array(n).fill(0).map(() => Math.random());
    candidates.push(normalizeVector(candidate));
  }
  
  // Evaluate each candidate
  let bestCandidate = candidates[0];
  let bestScore = -Infinity;
  
  for (const candidate of candidates) {
    let score = 0;
    let satisfied = 0;
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const ratio = candidate[i] / candidate[j];
        const expected = matrix[i][j];
        const deviation = Math.abs(Math.log(ratio) - Math.log(expected));
        
        // Tolerance of 0.5 in log scale
        if (deviation < 0.5) satisfied++;
        score -= deviation;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }
  
  // Refine with small perturbations
  for (let iter = 0; iter < 100; iter++) {
    const perturbation = bestCandidate.map(w => w + (Math.random() - 0.5) * 0.02);
    const normalized = normalizeVector(perturbation.map(p => Math.max(p, 0.001)));
    
    let score = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const ratio = normalized[i] / normalized[j];
        const expected = matrix[i][j];
        score -= Math.abs(Math.log(ratio) - Math.log(expected));
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = normalized;
    }
  }
  
  // Count satisfied constraints
  let satisfiedConstraints = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const ratio = bestCandidate[i] / bestCandidate[j];
      const expected = matrix[i][j];
      const deviation = Math.abs(Math.log(ratio) - Math.log(expected));
      if (deviation < 0.5) satisfiedConstraints++;
    }
  }
  
  return {
    weights: bestCandidate,
    feasibilityScore: Math.exp(bestScore / totalConstraints),
    satisfiedConstraints,
    totalConstraints
  };
}

// ============================================
// 5. Fuzzy Lambda-Max method
// ============================================
function fuzzyMembership(x: number, fuzzy: FuzzyNumber): number {
  const { l, m, u } = fuzzy;
  if (x < l || x > u) return 0;
  if (x === m) return 1;
  if (x < m) return (x - l) / (m - l);
  return (u - x) / (u - m);
}

export function fuzzyLambdaMaxMethod(fuzzyMatrix: FuzzyMatrix): {
  weights: number[],
  lambda: number,
  weakestComparison: string,
  satisfactionByComparison: Map<string, number>
} {
  const n = fuzzyMatrix.length;
  
  // Generate candidate weight vectors
  const candidates: number[][] = [];
  
  // Use crisp middle values to get initial candidates
  const crispMatrix: Matrix = fuzzyMatrix.map(row => row.map(f => f.m));
  candidates.push(eigenvectorMethod(crispMatrix));
  candidates.push(geometricMeanMethod(crispMatrix));
  
  // Generate random candidates
  for (let i = 0; i < 100; i++) {
    const candidate = Array(n).fill(0).map(() => Math.random());
    candidates.push(normalizeVector(candidate));
  }
  
  let bestCandidate = candidates[0];
  let bestLambda = -1;
  let bestSatisfaction = new Map<string, number>();
  let weakestPair = '';
  
  for (const candidate of candidates) {
    let minSatisfaction = Infinity;
    let weakest = '';
    const satisfaction = new Map<string, number>();
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const ratio = candidate[i] / candidate[j];
        const fuzzy = fuzzyMatrix[i][j];
        const sat = fuzzyMembership(ratio, fuzzy);
        const key = `${i}-${j}`;
        satisfaction.set(key, sat);
        
        if (sat < minSatisfaction) {
          minSatisfaction = sat;
          weakest = key;
        }
      }
    }
    
    if (minSatisfaction > bestLambda) {
      bestLambda = minSatisfaction;
      bestCandidate = candidate;
      bestSatisfaction = satisfaction;
      weakestPair = weakest;
    }
  }
  
  // Refine with perturbations
  for (let iter = 0; iter < 200; iter++) {
    const perturbation = bestCandidate.map(w => w + (Math.random() - 0.5) * 0.02);
    const normalized = normalizeVector(perturbation.map(p => Math.max(p, 0.001)));
    
    let minSatisfaction = Infinity;
    let weakest = '';
    const satisfaction = new Map<string, number>();
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const ratio = normalized[i] / normalized[j];
        const fuzzy = fuzzyMatrix[i][j];
        const sat = fuzzyMembership(ratio, fuzzy);
        const key = `${i}-${j}`;
        satisfaction.set(key, sat);
        
        if (sat < minSatisfaction) {
          minSatisfaction = sat;
          weakest = key;
        }
      }
    }
    
    if (minSatisfaction > bestLambda) {
      bestLambda = minSatisfaction;
      bestCandidate = normalized;
      bestSatisfaction = satisfaction;
      weakestPair = weakest;
    }
  }
  
  return {
    weights: bestCandidate,
    lambda: bestLambda,
    weakestComparison: weakestPair,
    satisfactionByComparison: bestSatisfaction
  };
}

// ============================================
// 6. Consistency calculation
// ============================================
export function calculateConsistency(matrix: Matrix): ConsistencyResult {
  const n = matrix.length;
  
  if (n <= 2) {
    return { lambdaMax: n, ci: 0, cr: 0, isConsistent: true };
  }
  
  const weights = eigenvectorMethod(matrix);
  const Aw = matrixVectorMultiply(matrix, weights);
  
  // Calculate lambda_max
  const lambdaMax = Aw.reduce((sum, val, i) => sum + val / weights[i], 0) / n;
  
  // Consistency Index
  const ci = (lambdaMax - n) / (n - 1);
  
  // Consistency Ratio
  const ri = RI[n] ?? 1.49;
  const cr = ri > 0 ? ci / ri : 0;
  
  return {
    lambdaMax,
    ci,
    cr,
    isConsistent: cr <= 0.1
  };
}

// ============================================
// 7. Normalize evaluations
// ============================================
export function normalizeEvaluations(
  evaluations: number[][],
  criteria: Criterion[]
): number[][] {
  const numAlternatives = evaluations.length;
  const numCriteria = criteria.length;
  
  const normalized: number[][] = Array(numAlternatives)
    .fill(null)
    .map(() => Array(numCriteria).fill(0));
  
  for (let j = 0; j < numCriteria; j++) {
    const column = evaluations.map(row => row[j]);
    const min = Math.min(...column);
    const max = Math.max(...column);
    const range = max - min;
    
    for (let i = 0; i < numAlternatives; i++) {
      if (range === 0) {
        normalized[i][j] = 1;
      } else if (criteria[j].type === 'benefit') {
        // Higher is better
        normalized[i][j] = (evaluations[i][j] - min) / range;
      } else {
        // Lower is better (cost)
        normalized[i][j] = (max - evaluations[i][j]) / range;
      }
    }
  }
  
  return normalized;
}

// ============================================
// 8. Calculate final scores
// ============================================
export function calculateFinalScores(
  normalizedEvaluations: number[][],
  weights: number[]
): number[] {
  return normalizedEvaluations.map(row =>
    row.reduce((sum, val, i) => sum + val * weights[i], 0)
  );
}

// ============================================
// 9. Calculate all method results
// ============================================
export function calculateAllMethods(
  comparisonMatrix: Matrix,
  fuzzyMatrix: FuzzyMatrix,
  normalizedEvaluations: number[][],
  criteria: Criterion[],
  alternatives: Alternative[]
): MethodResult[] {
  const results: MethodResult[] = [];
  
  // 1. Eigenvector
  const evWeights = eigenvectorMethod(comparisonMatrix);
  const evScores = calculateFinalScores(normalizedEvaluations, evWeights);
  const evWinnerIndex = evScores.indexOf(Math.max(...evScores));
  const consistency = calculateConsistency(comparisonMatrix);
  
  results.push({
    method: 'eigenvector',
    methodName: METHOD_NAMES['eigenvector'],
    weights: evWeights,
    scores: evScores,
    winner: alternatives[evWinnerIndex]?.name ?? '',
    winnerScore: evScores[evWinnerIndex],
    consistency: consistency.cr,
    observation: consistency.isConsistent ? 'CR aceitável' : 'Revisar julgamentos'
  });
  
  // 2. Geometric Mean
  const gmWeights = geometricMeanMethod(comparisonMatrix);
  const gmScores = calculateFinalScores(normalizedEvaluations, gmWeights);
  const gmWinnerIndex = gmScores.indexOf(Math.max(...gmScores));
  
  results.push({
    method: 'geometric-mean',
    methodName: METHOD_NAMES['geometric-mean'],
    weights: gmWeights,
    scores: gmScores,
    winner: alternatives[gmWinnerIndex]?.name ?? '',
    winnerScore: gmScores[gmWinnerIndex],
    consistency: consistency.cr,
    observation: 'Resultado próximo ao autovetor'
  });
  
  // 3. Linear Programming
  const lpResult = linearProgrammingMethod(comparisonMatrix);
  const lpScores = calculateFinalScores(normalizedEvaluations, lpResult.weights);
  const lpWinnerIndex = lpScores.indexOf(Math.max(...lpScores));
  
  results.push({
    method: 'linear-programming',
    methodName: METHOD_NAMES['linear-programming'],
    weights: lpResult.weights,
    scores: lpScores,
    winner: alternatives[lpWinnerIndex]?.name ?? '',
    winnerScore: lpScores[lpWinnerIndex],
    observation: `Viabilidade: ${(lpResult.feasibilityScore * 100).toFixed(0)}%`
  });
  
  // 4. Fuzzy Lambda-Max
  const fuzzyResult = fuzzyLambdaMaxMethod(fuzzyMatrix);
  const fzScores = calculateFinalScores(normalizedEvaluations, fuzzyResult.weights);
  const fzWinnerIndex = fzScores.indexOf(Math.max(...fzScores));
  
  results.push({
    method: 'fuzzy-lambda-max',
    methodName: METHOD_NAMES['fuzzy-lambda-max'],
    weights: fuzzyResult.weights,
    scores: fzScores,
    winner: alternatives[fzWinnerIndex]?.name ?? '',
    winnerScore: fzScores[fzWinnerIndex],
    lambda: fuzzyResult.lambda,
    observation: `λ = ${fuzzyResult.lambda.toFixed(2)}`
  });
  
  return results;
}
