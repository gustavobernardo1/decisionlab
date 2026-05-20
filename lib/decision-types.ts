export type CriterionType = 'benefit' | 'cost';

export type MethodType = 'eigenvector' | 'geometric-mean' | 'linear-programming' | 'fuzzy-lambda-max';

export interface Criterion {
  id: string;
  name: string;
  description: string;
  type: CriterionType;
}

export interface Alternative {
  id: string;
  name: string;
}

export interface FuzzyNumber {
  l: number; // lower
  m: number; // middle
  u: number; // upper
}

export type Matrix = number[][];
export type FuzzyMatrix = FuzzyNumber[][];

export interface ComparisonResult {
  preferredIndex: number | null; // null means equal, 0 means left, 1 means right
  intensity: number;
}

export interface ProblemConfig {
  name: string;
  objective: string;
  criteria: Criterion[];
  alternatives: Alternative[];
  selectedMethod: MethodType;
  evaluationMode: 'normalized' | 'raw';
}

export interface MethodResult {
  method: MethodType;
  methodName: string;
  weights: number[];
  scores: number[];
  winner: string;
  winnerScore: number;
  consistency?: number;
  lambda?: number;
  observation: string;
}

export interface ConsistencyResult {
  lambdaMax: number;
  ci: number;
  cr: number;
  isConsistent: boolean;
}

// Fuzzy intensity mappings
export const FUZZY_SCALE: Record<number, FuzzyNumber> = {
  1: { l: 1, m: 1, u: 1 },
  2: { l: 1, m: 2, u: 3 },
  3: { l: 2, m: 3, u: 4 },
  4: { l: 3, m: 4, u: 5 },
  5: { l: 4, m: 5, u: 6 },
  6: { l: 5, m: 6, u: 7 },
  7: { l: 6, m: 7, u: 8 },
  8: { l: 7, m: 8, u: 9 },
  9: { l: 8, m: 9, u: 9 },
};

// Random Index values for consistency calculation
export const RI: Record<number, number> = {
  1: 0,
  2: 0,
  3: 0.58,
  4: 0.90,
  5: 1.12,
  6: 1.24,
  7: 1.32,
  8: 1.41,
  9: 1.45,
  10: 1.49,
};

export const METHOD_NAMES: Record<MethodType, string> = {
  'eigenvector': 'Autovetor Principal',
  'geometric-mean': 'Média Geométrica',
  'linear-programming': 'Programação Linear',
  'fuzzy-lambda-max': 'Fuzzy Lambda-Max',
};

export const METHOD_DESCRIPTIONS: Record<MethodType, string> = {
  'eigenvector': 'Obtém o vetor de prioridades a partir do autovetor associado ao maior autovalor da matriz de comparação.',
  'geometric-mean': 'Calcula os pesos a partir da média geométrica das linhas da matriz de comparação.',
  'linear-programming': 'Busca pesos compatíveis com os julgamentos por meio de uma formulação de otimização com restrições.',
  'fuzzy-lambda-max': 'Representa julgamentos incertos por números fuzzy triangulares e busca pesos compatíveis no maior grau possível.',
};

export const DEFAULT_CRITERIA: Criterion[] = [
  { id: '1', name: 'Custo', description: 'Custo financeiro associado à alternativa.', type: 'cost' },
  { id: '2', name: 'Qualidade', description: 'Qualidade geral percebida na alternativa.', type: 'benefit' },
  { id: '3', name: 'Risco', description: 'Nível de risco associado à alternativa.', type: 'cost' },
  { id: '4', name: 'Viabilidade', description: 'Viabilidade prática de implementação.', type: 'benefit' },
];

export const DEFAULT_ALTERNATIVES: Alternative[] = [
  { id: '1', name: 'Alternativa A' },
  { id: '2', name: 'Alternativa B' },
  { id: '3', name: 'Alternativa C' },
];
