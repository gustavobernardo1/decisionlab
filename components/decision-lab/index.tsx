'use client';

import { useState, useCallback } from 'react';
import { 
  ProblemConfig, 
  MethodType,
  DEFAULT_CRITERIA,
  DEFAULT_ALTERNATIVES 
} from '@/lib/decision-types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, GitCompare, ClipboardList, BarChart3, FlaskConical } from 'lucide-react';

import ConfigureStep from './configure-step';
import CompareStep from './compare-step';
import EvaluateStep from './evaluate-step';
import ResultsStep from './results-step';
import EducationalPanel from './educational-panel';

type Step = 'configure' | 'compare' | 'evaluate' | 'results';

const STEPS: { id: Step; label: string; icon: React.ReactNode }[] = [
  { id: 'configure', label: 'Configurar', icon: <Settings className="h-4 w-4" /> },
  { id: 'compare', label: 'Comparar', icon: <GitCompare className="h-4 w-4" /> },
  { id: 'evaluate', label: 'Avaliar', icon: <ClipboardList className="h-4 w-4" /> },
  { id: 'results', label: 'Resultados', icon: <BarChart3 className="h-4 w-4" /> },
];

const initialConfig: ProblemConfig = {
  name: '',
  objective: '',
  criteria: DEFAULT_CRITERIA,
  alternatives: DEFAULT_ALTERNATIVES,
  selectedMethod: 'eigenvector',
  evaluationMode: 'normalized',
};

export default function DecisionLab() {
  const [currentStep, setCurrentStep] = useState<Step>('configure');
  const [config, setConfig] = useState<ProblemConfig>(initialConfig);
  const [comparisons, setComparisons] = useState<Map<string, number>>(new Map());
  const [evaluations, setEvaluations] = useState<number[][]>([]);

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

  // Initialize comparisons when moving to compare step
  const handleToCompare = useCallback(() => {
    // Initialize all comparisons with 1 (equal importance)
    const newComparisons = new Map<string, number>();
    const n = config.criteria.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        newComparisons.set(`${i}-${j}`, 1);
      }
    }
    setComparisons(newComparisons);
    setCurrentStep('compare');
  }, [config.criteria.length]);

  // Initialize evaluations when moving to evaluate step
  const handleToEvaluate = useCallback(() => {
    // Initialize evaluations matrix
    const newEvaluations = config.alternatives.map(() =>
      config.criteria.map(() => 0)
    );
    setEvaluations(newEvaluations);
    setCurrentStep('evaluate');
  }, [config.alternatives, config.criteria]);

  const handleRestart = () => {
    setCurrentStep('configure');
    setConfig(initialConfig);
    setComparisons(new Map());
    setEvaluations([]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">DecisionLab</h1>
              <p className="text-sm text-muted-foreground">
                Plataforma computacional para apoio à tomada de decisão sob incerteza
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Stepper */}
      <div className="border-b bg-card/50">
        <div className="container mx-auto px-4">
          <nav className="flex" aria-label="Progress">
            {STEPS.map((step, index) => {
              const isActive = step.id === currentStep;
              const isCompleted = index < currentStepIndex;
              
              return (
                <button
                  key={step.id}
                  onClick={() => {
                    if (isCompleted) {
                      setCurrentStep(step.id);
                    }
                  }}
                  disabled={!isCompleted && !isActive}
                  className={`
                    flex-1 flex items-center justify-center gap-2 py-4 border-b-2 transition-colors
                    ${isActive 
                      ? 'border-primary text-primary font-medium' 
                      : isCompleted 
                        ? 'border-primary/50 text-primary/70 hover:text-primary cursor-pointer' 
                        : 'border-transparent text-muted-foreground'
                    }
                  `}
                >
                  <span className={`
                    flex items-center justify-center w-7 h-7 rounded-full text-sm
                    ${isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : isCompleted 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-muted text-muted-foreground'
                    }
                  `}>
                    {isCompleted ? '✓' : index + 1}
                  </span>
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Main Panel */}
          <div>
            {currentStep === 'configure' && (
              <ConfigureStep
                config={config}
                onConfigChange={setConfig}
                onNext={handleToCompare}
              />
            )}

            {currentStep === 'compare' && (
              <CompareStep
                criteria={config.criteria}
                comparisons={comparisons}
                onComparisonsChange={setComparisons}
                onNext={handleToEvaluate}
                onBack={() => setCurrentStep('configure')}
              />
            )}

            {currentStep === 'evaluate' && (
              <EvaluateStep
                criteria={config.criteria}
                alternatives={config.alternatives}
                evaluations={evaluations}
                evaluationMode={config.evaluationMode}
                onEvaluationsChange={setEvaluations}
                onModeChange={(mode) => setConfig({ ...config, evaluationMode: mode })}
                onNext={() => setCurrentStep('results')}
                onBack={() => setCurrentStep('compare')}
              />
            )}

            {currentStep === 'results' && (
              <ResultsStep
                criteria={config.criteria}
                alternatives={config.alternatives}
                comparisons={comparisons}
                evaluations={evaluations}
                evaluationMode={config.evaluationMode}
                selectedMethod={config.selectedMethod}
                problemName={config.name || 'Análise Multicritério'}
                onBack={() => setCurrentStep('evaluate')}
                onRestart={handleRestart}
              />
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Problem Summary */}
            {(config.name || config.objective) && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    {config.name && (
                      <h3 className="font-semibold">{config.name}</h3>
                    )}
                    {config.objective && (
                      <p className="text-sm text-muted-foreground">{config.objective}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold">{config.criteria.length}</p>
                    <p className="text-xs text-muted-foreground">Critérios</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{config.alternatives.length}</p>
                    <p className="text-xs text-muted-foreground">Alternativas</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Método</p>
                  <Badge variant="secondary">{
                    config.selectedMethod === 'eigenvector' ? 'Autovetor Principal' :
                    config.selectedMethod === 'geometric-mean' ? 'Média Geométrica' :
                    config.selectedMethod === 'linear-programming' ? 'Programação Linear' :
                    'Fuzzy Lambda-Max'
                  }</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Educational Panel */}
            <EducationalPanel />
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-auto">
        <div className="container mx-auto px-4 py-6">
          <p className="text-sm text-muted-foreground text-center">
            DecisionLab — Plataforma acadêmica para pesquisa em Tomada de Decisão Multicritério
          </p>
        </div>
      </footer>
    </div>
  );
}
