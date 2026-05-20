'use client';

import { useMemo } from 'react';
import { 
  Criterion, 
  Alternative, 
  MethodType,
  MethodResult,
  METHOD_NAMES
} from '@/lib/decision-types';
import {
  buildReciprocalMatrix,
  buildFuzzyMatrix,
  calculateConsistency,
  normalizeEvaluations,
  calculateAllMethods,
} from '@/lib/decision-math';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Trophy, AlertTriangle, CheckCircle, BarChart3, Medal } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ResultsStepProps {
  criteria: Criterion[];
  alternatives: Alternative[];
  comparisons: Map<string, number>;
  evaluations: number[][];
  evaluationMode: 'normalized' | 'raw';
  selectedMethod: MethodType;
  problemName: string;
  onBack: () => void;
  onRestart: () => void;
}

export default function ResultsStep({
  criteria,
  alternatives,
  comparisons,
  evaluations,
  evaluationMode,
  selectedMethod,
  problemName,
  onBack,
  onRestart,
}: ResultsStepProps) {
  
  const results = useMemo(() => {
    const n = criteria.length;
    const matrix = buildReciprocalMatrix(n, comparisons);
    const fuzzyMatrix = buildFuzzyMatrix(n, comparisons);
    
    // Normalize evaluations
    let normalizedEvals: number[][];
    if (evaluationMode === 'normalized') {
      // Already 0-10, just normalize to 0-1
      normalizedEvals = evaluations.map(row => row.map(v => v / 10));
    } else {
      normalizedEvals = normalizeEvaluations(evaluations, criteria);
    }
    
    const consistency = calculateConsistency(matrix);
    const allMethods = calculateAllMethods(matrix, fuzzyMatrix, normalizedEvals, criteria, alternatives);
    
    return { consistency, allMethods, matrix };
  }, [criteria, alternatives, comparisons, evaluations, evaluationMode]);

  const primaryResult = results.allMethods.find(r => r.method === selectedMethod) ?? results.allMethods[0];
  
  // Ranking
  const ranking = useMemo(() => {
    const indexed = primaryResult.scores.map((score, i) => ({ 
      name: alternatives[i].name, 
      score,
      index: i 
    }));
    return indexed.sort((a, b) => b.score - a.score);
  }, [primaryResult, alternatives]);

  // Check if all methods agree on winner
  const allAgree = results.allMethods.every(r => r.winner === results.allMethods[0].winner);

  // Prepare chart data
  const weightsChartData = criteria.map((crit, i) => ({
    name: crit.name,
    peso: parseFloat((primaryResult.weights[i] * 100).toFixed(1)),
  }));

  const scoresChartData = alternatives.map((alt, i) => ({
    name: alt.name,
    pontuação: parseFloat((primaryResult.scores[i] * 100).toFixed(1)),
  }));

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Método Selecionado</CardDescription>
            <CardTitle className="text-lg">{METHOD_NAMES[selectedMethod]}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Critérios</CardDescription>
            <CardTitle className="text-2xl">{criteria.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Alternativas</CardDescription>
            <CardTitle className="text-2xl">{alternatives.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Razão de Consistência</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <span className={results.consistency.isConsistent ? 'text-primary' : 'text-destructive'}>
                {(results.consistency.cr * 100).toFixed(1)}%
              </span>
              {results.consistency.isConsistent ? (
                <CheckCircle className="h-5 w-5 text-primary" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Consistency Alert */}
      {!results.consistency.isConsistent && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Consistência não aceitável</AlertTitle>
          <AlertDescription>
            A razão de consistência (CR = {(results.consistency.cr * 100).toFixed(1)}%) excede 10%. 
            Considere revisar os julgamentos para obter resultados mais confiáveis.
          </AlertDescription>
        </Alert>
      )}

      {/* Winner Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Alternativa Vencedora
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <p className="text-3xl font-bold text-primary">{primaryResult.winner}</p>
            <p className="text-muted-foreground">
              Pontuação: {(primaryResult.winnerScore * 100).toFixed(1)}%
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Ranking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="h-5 w-5 text-primary" />
            Ranking Final
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ranking.map((item, i) => (
              <div
                key={item.name}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  i === 0 ? 'bg-primary/10 border-primary/30' : 'bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-2xl font-bold ${i === 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                    {i + 1}º
                  </span>
                  <span className="font-medium">{item.name}</span>
                </div>
                <Badge variant={i === 0 ? 'default' : 'secondary'} className="text-sm">
                  {(item.score * 100).toFixed(1)}%
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weights Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Pesos dos Critérios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weightsChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" domain={[0, 100]} unit="%" />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip formatter={(value) => [`${value}%`, 'Peso']} />
                <Bar dataKey="peso" radius={[0, 4, 4, 0]}>
                  {weightsChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Scores Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Pontuações das Alternativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={scoresChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} unit="%" />
                <Tooltip formatter={(value) => [`${value}%`, 'Pontuação']} />
                <Bar dataKey="pontuação" radius={[4, 4, 0, 0]}>
                  {scoresChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Method Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Comparação entre Métodos</CardTitle>
          <CardDescription>
            Resultados calculados por cada método de obtenção de pesos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Método</TableHead>
                  <TableHead>Pesos dos Critérios</TableHead>
                  <TableHead>Vencedor</TableHead>
                  <TableHead>Pontuação</TableHead>
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.allMethods.map((result) => (
                  <TableRow key={result.method} className={result.method === selectedMethod ? 'bg-primary/5' : ''}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {result.methodName}
                        {result.method === selectedMethod && (
                          <Badge variant="outline" className="text-xs">Principal</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {result.weights.map((w, i) => (
                        <span key={i}>
                          {criteria[i].name}: {(w * 100).toFixed(1)}%
                          {i < result.weights.length - 1 && <br />}
                        </span>
                      ))}
                    </TableCell>
                    <TableCell className="font-medium">{result.winner}</TableCell>
                    <TableCell>{(result.winnerScore * 100).toFixed(1)}%</TableCell>
                    <TableCell className="text-muted-foreground">{result.observation}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Stability Message */}
      <Alert variant={allAgree ? 'default' : 'destructive'}>
        {allAgree ? (
          <CheckCircle className="h-4 w-4" />
        ) : (
          <AlertTriangle className="h-4 w-4" />
        )}
        <AlertTitle>{allAgree ? 'Ranking Estável' : 'Sensibilidade ao Método'}</AlertTitle>
        <AlertDescription>
          {allAgree
            ? 'O ranking é estável entre os métodos analisados. Todos concordam com a alternativa vencedora.'
            : 'Há sensibilidade ao método escolhido. Recomenda-se revisar os julgamentos ou analisar os critérios com maior peso.'}
        </AlertDescription>
      </Alert>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={onRestart}>
          Nova Análise
        </Button>
      </div>
    </div>
  );
}
