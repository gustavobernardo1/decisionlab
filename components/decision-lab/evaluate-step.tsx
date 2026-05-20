'use client';

import { Criterion, Alternative } from '@/lib/decision-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, ArrowRight, Info } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface EvaluateStepProps {
  criteria: Criterion[];
  alternatives: Alternative[];
  evaluations: number[][];
  evaluationMode: 'normalized' | 'raw';
  onEvaluationsChange: (evaluations: number[][]) => void;
  onModeChange: (mode: 'normalized' | 'raw') => void;
  onNext: () => void;
  onBack: () => void;
}

export default function EvaluateStep({
  criteria,
  alternatives,
  evaluations,
  evaluationMode,
  onEvaluationsChange,
  onModeChange,
  onNext,
  onBack,
}: EvaluateStepProps) {
  
  const updateEvaluation = (altIndex: number, critIndex: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newEvaluations = evaluations.map((row, i) =>
      i === altIndex
        ? row.map((val, j) => (j === critIndex ? numValue : val))
        : [...row]
    );
    onEvaluationsChange(newEvaluations);
  };

  const allEvaluationsFilled = evaluations.every(row =>
    row.every(val => val > 0)
  );

  return (
    <div className="space-y-6">
      {/* Evaluation Mode */}
      <Card>
        <CardHeader>
          <CardTitle>Modo de Avaliação</CardTitle>
          <CardDescription>
            Escolha como deseja informar o desempenho das alternativas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={evaluationMode}
            onValueChange={(value) => onModeChange(value as 'normalized' | 'raw')}
            className="flex gap-6"
          >
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="normalized" id="normalized" className="mt-1" />
              <Label htmlFor="normalized" className="cursor-pointer">
                <div className="font-medium">Nota normalizada (0 a 10)</div>
                <div className="text-sm text-muted-foreground">
                  10 sempre representa o melhor desempenho.
                </div>
              </Label>
            </div>
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="raw" id="raw" className="mt-1" />
              <Label htmlFor="raw" className="cursor-pointer">
                <div className="font-medium">Valor bruto</div>
                <div className="text-sm text-muted-foreground">
                  Informe valores reais (custo em R$, tempo em dias, etc.).
                </div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Info Alert */}
      {evaluationMode === 'raw' && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Critérios de benefício favorecem valores maiores; critérios de custo favorecem valores menores. 
            A normalização é feita automaticamente no cálculo final.
          </AlertDescription>
        </Alert>
      )}

      {/* Evaluation Table */}
      <Card>
        <CardHeader>
          <CardTitle>Avaliação das Alternativas</CardTitle>
          <CardDescription>
            {evaluationMode === 'normalized'
              ? 'Informe notas de 0 a 10 para cada alternativa em cada critério.'
              : 'Informe os valores reais de desempenho para cada alternativa.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]">Alternativa</TableHead>
                  {criteria.map((crit) => (
                    <TableHead key={crit.id} className="min-w-[120px] text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span>{crit.name}</span>
                        <Badge variant={crit.type === 'benefit' ? 'default' : 'secondary'} className="text-xs">
                          {crit.type === 'benefit' ? 'Benefício' : 'Custo'}
                        </Badge>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {alternatives.map((alt, altIndex) => (
                  <TableRow key={alt.id}>
                    <TableCell className="font-medium">{alt.name}</TableCell>
                    {criteria.map((crit, critIndex) => (
                      <TableCell key={crit.id}>
                        <Input
                          type="number"
                          min={evaluationMode === 'normalized' ? 0 : undefined}
                          max={evaluationMode === 'normalized' ? 10 : undefined}
                          step={evaluationMode === 'normalized' ? 0.5 : 0.01}
                          value={evaluations[altIndex]?.[critIndex] || ''}
                          onChange={(e) => updateEvaluation(altIndex, critIndex, e.target.value)}
                          placeholder={evaluationMode === 'normalized' ? '0-10' : 'Valor'}
                          className="w-full text-center"
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Fill Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preenchimento Rápido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const randomEvaluations = alternatives.map(() =>
                  criteria.map(() => 
                    evaluationMode === 'normalized'
                      ? Math.round(Math.random() * 10 * 2) / 2
                      : Math.round(Math.random() * 1000)
                  )
                );
                onEvaluationsChange(randomEvaluations);
              }}
            >
              Preencher Aleatório
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const clearEvaluations = alternatives.map(() =>
                  criteria.map(() => 0)
                );
                onEvaluationsChange(clearEvaluations);
              }}
            >
              Limpar Tudo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={onNext} disabled={!allEvaluationsFilled}>
          Ver Resultados
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
      {!allEvaluationsFilled && (
        <p className="text-sm text-muted-foreground text-center">
          Preencha todos os valores para continuar.
        </p>
      )}
    </div>
  );
}
