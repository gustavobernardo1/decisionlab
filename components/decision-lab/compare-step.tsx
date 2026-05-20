'use client';

import { useState, useMemo } from 'react';
import { Criterion } from '@/lib/decision-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Check, Equal, ChevronLeft, ChevronRight } from 'lucide-react';

interface CompareStepProps {
  criteria: Criterion[];
  comparisons: Map<string, number>;
  onComparisonsChange: (comparisons: Map<string, number>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface Comparison {
  i: number;
  j: number;
  leftCriterion: Criterion;
  rightCriterion: Criterion;
}

const INTENSITY_OPTIONS = [
  { value: 2, label: 'Pouco mais importante', shortLabel: '2' },
  { value: 3, label: 'Moderadamente mais importante', shortLabel: '3' },
  { value: 5, label: 'Fortemente mais importante', shortLabel: '5' },
  { value: 7, label: 'Muito fortemente mais importante', shortLabel: '7' },
  { value: 9, label: 'Extremamente mais importante', shortLabel: '9' },
];

const INTENSITY_ADVANCED = [
  { value: 4, label: 'Entre moderado e forte', shortLabel: '4' },
  { value: 6, label: 'Entre forte e muito forte', shortLabel: '6' },
  { value: 8, label: 'Entre muito forte e extremo', shortLabel: '8' },
];

export default function CompareStep({ 
  criteria, 
  comparisons, 
  onComparisonsChange, 
  onNext, 
  onBack 
}: CompareStepProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Generate all pairs for comparison
  const pairs: Comparison[] = useMemo(() => {
    const result: Comparison[] = [];
    for (let i = 0; i < criteria.length; i++) {
      for (let j = i + 1; j < criteria.length; j++) {
        result.push({
          i,
          j,
          leftCriterion: criteria[i],
          rightCriterion: criteria[j],
        });
      }
    }
    return result;
  }, [criteria]);

  const currentPair = pairs[currentIndex];
  const key = currentPair ? `${currentPair.i}-${currentPair.j}` : '';
  const currentValue = comparisons.get(key) ?? 1;

  // Determine which side is preferred and intensity
  const getPreference = (): { preferred: 'left' | 'right' | 'equal', intensity: number } => {
    if (currentValue === 1) return { preferred: 'equal', intensity: 1 };
    if (currentValue > 1) return { preferred: 'left', intensity: currentValue };
    return { preferred: 'right', intensity: Math.round(1 / currentValue) };
  };

  const { preferred, intensity } = getPreference();

  const setComparison = (value: number) => {
    const newComparisons = new Map(comparisons);
    newComparisons.set(key, value);
    onComparisonsChange(newComparisons);
  };

  const handlePreferenceClick = (side: 'left' | 'right' | 'equal') => {
    if (side === 'equal') {
      setComparison(1);
    } else if (side === 'left') {
      // If already preferring left, keep the intensity, otherwise default to 3
      if (preferred === 'left') {
        setComparison(intensity);
      } else {
        setComparison(3);
      }
    } else {
      // Right preference
      if (preferred === 'right') {
        setComparison(1 / intensity);
      } else {
        setComparison(1 / 3);
      }
    }
  };

  const handleIntensityClick = (intensityValue: number) => {
    if (preferred === 'left' || preferred === 'equal') {
      setComparison(intensityValue);
    } else {
      setComparison(1 / intensityValue);
    }
  };

  const getJudgmentText = () => {
    if (currentValue === 1) {
      return `${currentPair?.leftCriterion.name} e ${currentPair?.rightCriterion.name} possuem a mesma importância.`;
    }
    
    const intensityLabels: Record<number, string> = {
      2: 'pouco mais importante',
      3: 'moderadamente mais importante',
      4: 'entre moderado e fortemente mais importante',
      5: 'fortemente mais importante',
      6: 'entre forte e muito fortemente mais importante',
      7: 'muito fortemente mais importante',
      8: 'entre muito forte e extremamente mais importante',
      9: 'extremamente mais importante',
    };

    if (currentValue > 1) {
      const label = intensityLabels[Math.round(currentValue)] ?? 'mais importante';
      return `${currentPair?.leftCriterion.name} é ${label} que ${currentPair?.rightCriterion.name}.`;
    } else {
      const inv = Math.round(1 / currentValue);
      const label = intensityLabels[inv] ?? 'mais importante';
      return `${currentPair?.rightCriterion.name} é ${label} que ${currentPair?.leftCriterion.name}.`;
    }
  };

  const getValueText = () => {
    if (currentValue === 1) {
      return `a[${currentPair?.i},${currentPair?.j}] = 1 e a[${currentPair?.j},${currentPair?.i}] = 1`;
    }
    if (currentValue > 1) {
      return `a[${currentPair?.i},${currentPair?.j}] = ${currentValue} e a[${currentPair?.j},${currentPair?.i}] = 1/${currentValue}`;
    }
    const inv = Math.round(1 / currentValue);
    return `a[${currentPair?.i},${currentPair?.j}] = 1/${inv} e a[${currentPair?.j},${currentPair?.i}] = ${inv}`;
  };

  const progress = pairs.length > 0 ? ((currentIndex + 1) / pairs.length) * 100 : 0;
  const allOptionsSelected = [...comparisons.keys()].length >= pairs.length;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Comparação Par a Par</CardTitle>
            <Badge variant="secondary">
              {currentIndex + 1} de {pairs.length}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>
      </Card>

      {currentPair && (
        <>
          {/* Comparison Card */}
          <Card>
            <CardHeader>
              <CardDescription className="text-center text-base">
                Qual critério é mais importante nesta comparação?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Criteria Buttons */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant={preferred === 'left' ? 'default' : 'outline'}
                  size="lg"
                  className="min-w-[140px] h-14 text-base"
                  onClick={() => handlePreferenceClick('left')}
                >
                  {currentPair.leftCriterion.name}
                </Button>
                
                <Button
                  variant={preferred === 'equal' ? 'default' : 'outline'}
                  size="lg"
                  className="h-14"
                  onClick={() => handlePreferenceClick('equal')}
                >
                  <Equal className="h-5 w-5 mr-2" />
                  Igual
                </Button>
                
                <Button
                  variant={preferred === 'right' ? 'default' : 'outline'}
                  size="lg"
                  className="min-w-[140px] h-14 text-base"
                  onClick={() => handlePreferenceClick('right')}
                >
                  {currentPair.rightCriterion.name}
                </Button>
              </div>

              {/* Intensity Selection */}
              {preferred !== 'equal' && (
                <div className="space-y-4">
                  <p className="text-center text-sm text-muted-foreground">
                    Com qual intensidade?
                  </p>
                  
                  <div className="flex flex-wrap justify-center gap-2">
                    {INTENSITY_OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        variant={intensity === opt.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleIntensityClick(opt.value)}
                        className="min-w-[180px]"
                      >
                        <span className="font-mono mr-2">{opt.shortLabel}</span>
                        {opt.label}
                      </Button>
                    ))}
                  </div>

                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                    >
                      {showAdvanced ? 'Ocultar valores intermediários' : 'Mostrar valores intermediários (4, 6, 8)'}
                    </Button>
                  </div>

                  {showAdvanced && (
                    <div className="flex flex-wrap justify-center gap-2">
                      {INTENSITY_ADVANCED.map((opt) => (
                        <Button
                          key={opt.value}
                          variant={intensity === opt.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleIntensityClick(opt.value)}
                          className="min-w-[160px]"
                        >
                          <span className="font-mono mr-2">{opt.shortLabel}</span>
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Judgment Summary */}
          <Card className="bg-muted/50">
            <CardContent className="py-4">
              <div className="space-y-2 text-center">
                <p className="font-medium">
                  <span className="text-muted-foreground">Julgamento atual:</span>{' '}
                  {getJudgmentText()}
                </p>
                <p className="text-sm text-muted-foreground font-mono">
                  Valor registrado: {getValueText()}
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex(currentIndex - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          
          {currentIndex < pairs.length - 1 ? (
            <Button onClick={() => setCurrentIndex(currentIndex + 1)}>
              Próxima
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={onNext} disabled={!allOptionsSelected}>
              <Check className="h-4 w-4 mr-2" />
              Concluir Comparações
            </Button>
          )}
        </div>

        <Button onClick={onNext} variant="outline" className="opacity-0 pointer-events-none">
          Placeholder
        </Button>
      </div>
    </div>
  );
}
