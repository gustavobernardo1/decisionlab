'use client';

import { useState } from 'react';
import { 
  ProblemConfig, 
  Criterion, 
  Alternative, 
  MethodType,
  DEFAULT_CRITERIA,
  DEFAULT_ALTERNATIVES 
} from '@/lib/decision-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Settings, Scale, Target, TrendingUp, TrendingDown } from 'lucide-react';
import { METHOD_NAMES, METHOD_DESCRIPTIONS } from '@/lib/decision-types';

interface ConfigureStepProps {
  config: ProblemConfig;
  onConfigChange: (config: ProblemConfig) => void;
  onNext: () => void;
}

export default function ConfigureStep({ config, onConfigChange, onNext }: ConfigureStepProps) {
  const [newCriterionName, setNewCriterionName] = useState('');
  const [newCriterionDesc, setNewCriterionDesc] = useState('');
  const [newCriterionType, setNewCriterionType] = useState<'benefit' | 'cost'>('benefit');
  const [newAlternativeName, setNewAlternativeName] = useState('');

  const addCriterion = () => {
    if (!newCriterionName.trim()) return;
    const newCriterion: Criterion = {
      id: Date.now().toString(),
      name: newCriterionName.trim(),
      description: newCriterionDesc.trim() || `Critério: ${newCriterionName.trim()}`,
      type: newCriterionType,
    };
    onConfigChange({
      ...config,
      criteria: [...config.criteria, newCriterion],
    });
    setNewCriterionName('');
    setNewCriterionDesc('');
    setNewCriterionType('benefit');
  };

  const removeCriterion = (id: string) => {
    onConfigChange({
      ...config,
      criteria: config.criteria.filter(c => c.id !== id),
    });
  };

  const updateCriterionType = (id: string, type: 'benefit' | 'cost') => {
    onConfigChange({
      ...config,
      criteria: config.criteria.map(c => c.id === id ? { ...c, type } : c),
    });
  };

  const addAlternative = () => {
    if (!newAlternativeName.trim()) return;
    const newAlternative: Alternative = {
      id: Date.now().toString(),
      name: newAlternativeName.trim(),
    };
    onConfigChange({
      ...config,
      alternatives: [...config.alternatives, newAlternative],
    });
    setNewAlternativeName('');
  };

  const removeAlternative = (id: string) => {
    onConfigChange({
      ...config,
      alternatives: config.alternatives.filter(a => a.id !== id),
    });
  };

  const loadDefaults = () => {
    onConfigChange({
      ...config,
      criteria: DEFAULT_CRITERIA,
      alternatives: DEFAULT_ALTERNATIVES,
    });
  };

  const canProceed = config.criteria.length >= 2 && config.alternatives.length >= 2;

  return (
    <div className="space-y-8">
      {/* Problem Definition */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Definição do Problema
          </CardTitle>
          <CardDescription>
            Identifique o problema de decisão que deseja analisar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Problema</Label>
            <Input
              id="name"
              placeholder="Ex: Seleção de Fornecedor"
              value={config.name}
              onChange={(e) => onConfigChange({ ...config, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="objective">Objetivo da Decisão</Label>
            <Textarea
              id="objective"
              placeholder="Ex: Escolher o fornecedor que melhor atende aos critérios de custo, qualidade e prazo."
              value={config.objective}
              onChange={(e) => onConfigChange({ ...config, objective: e.target.value })}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Criteria */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                Critérios
              </CardTitle>
              <CardDescription className="mt-1.5">
                Classifique cada critério como Benefício ou Custo. Critérios de benefício favorecem valores maiores; critérios de custo favorecem valores menores.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadDefaults}>
              Carregar Padrão
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {config.criteria.length > 0 && (
            <div className="grid gap-3">
              {config.criteria.map((criterion) => (
                <div
                  key={criterion.id}
                  className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{criterion.name}</span>
                      <Badge variant={criterion.type === 'benefit' ? 'default' : 'secondary'}>
                        {criterion.type === 'benefit' ? 'Benefício' : 'Custo'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{criterion.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={criterion.type === 'benefit' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateCriterionType(criterion.id, 'benefit')}
                      className="gap-1"
                    >
                      <TrendingUp className="h-3.5 w-3.5" />
                      Benefício
                    </Button>
                    <Button
                      variant={criterion.type === 'cost' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateCriterionType(criterion.id, 'cost')}
                      className="gap-1"
                    >
                      <TrendingDown className="h-3.5 w-3.5" />
                      Custo
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCriterion(criterion.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Input
              placeholder="Nome do critério"
              value={newCriterionName}
              onChange={(e) => setNewCriterionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCriterion()}
              className="flex-1"
            />
            <Input
              placeholder="Descrição (opcional)"
              value={newCriterionDesc}
              onChange={(e) => setNewCriterionDesc(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCriterion()}
              className="flex-1"
            />
            <Button onClick={addCriterion}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alternatives */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Alternativas
          </CardTitle>
          <CardDescription>
            Adicione as opções que serão avaliadas e comparadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {config.alternatives.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {config.alternatives.map((alt) => (
                <Badge
                  key={alt.id}
                  variant="secondary"
                  className="px-3 py-1.5 text-sm gap-2"
                >
                  {alt.name}
                  <button
                    onClick={() => removeAlternative(alt.id)}
                    className="hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              placeholder="Nome da alternativa"
              value={newAlternativeName}
              onChange={(e) => setNewAlternativeName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addAlternative()}
            />
            <Button onClick={addAlternative}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Method Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            Método Principal
          </CardTitle>
          <CardDescription>
            Selecione o método de cálculo de pesos que será destacado nos resultados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={config.selectedMethod}
            onValueChange={(value) => onConfigChange({ ...config, selectedMethod: value as MethodType })}
            className="grid gap-3"
          >
            {(Object.keys(METHOD_NAMES) as MethodType[]).map((method) => (
              <div key={method} className="flex items-start space-x-3">
                <RadioGroupItem value={method} id={method} className="mt-1" />
                <Label htmlFor={method} className="flex-1 cursor-pointer">
                  <div className="font-medium">{METHOD_NAMES[method]}</div>
                  <div className="text-sm text-muted-foreground">{METHOD_DESCRIPTIONS[method]}</div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!canProceed} size="lg">
          Avançar para Comparações
        </Button>
      </div>
      {!canProceed && (
        <p className="text-sm text-muted-foreground text-center">
          Adicione pelo menos 2 critérios e 2 alternativas para continuar.
        </p>
      )}
    </div>
  );
}
