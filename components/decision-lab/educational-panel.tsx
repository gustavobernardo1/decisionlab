'use client';

import { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';

const educationalContent = [
  {
    id: 'pairwise',
    question: 'O que é uma matriz de comparação par a par?',
    answer: 'Uma matriz de comparação par a par é uma ferramenta matemática onde cada elemento a[i][j] representa a importância relativa do critério i em relação ao critério j. A diagonal sempre contém 1 (cada critério é igualmente importante a si mesmo) e a matriz é recíproca: se a[i][j] = x, então a[j][i] = 1/x.'
  },
  {
    id: 'priority',
    question: 'O que é um vetor de prioridades?',
    answer: 'O vetor de prioridades (ou vetor de pesos) representa a importância relativa de cada critério na decisão. É calculado a partir da matriz de comparação e seus valores somam 1. Quanto maior o peso, mais influência o critério tem na pontuação final das alternativas.'
  },
  {
    id: 'consistency',
    question: 'Por que a consistência importa?',
    answer: 'A consistência mede se os julgamentos são coerentes entre si. Por exemplo, se A é mais importante que B, e B é mais importante que C, então A deve ser mais importante que C. A Razão de Consistência (CR) deve ser menor que 10% para que os julgamentos sejam considerados aceitáveis.'
  },
  {
    id: 'crisp',
    question: 'O que são valores crisp?',
    answer: 'Valores crisp são números exatos e precisos, como "5" ou "3.7". Na escala de Saaty, usamos valores crisp de 1 a 9 para representar a intensidade da preferência entre critérios. São chamados "crisp" em contraste com números fuzzy, que representam incerteza.'
  },
  {
    id: 'fuzzy',
    question: 'O que é um número fuzzy triangular?',
    answer: 'Um número fuzzy triangular (l, m, u) representa incerteza em um julgamento. O valor "m" é o mais provável, enquanto "l" e "u" são os limites inferior e superior. Por exemplo, (4, 5, 6) significa que a preferência real está entre 4 e 6, sendo 5 o valor mais provável.'
  },
  {
    id: 'lambda',
    question: 'O que significa o parâmetro λ no fuzzy lambda-max?',
    answer: 'O parâmetro λ (lambda) representa o grau de satisfação mínimo dos julgamentos fuzzy. Um λ de 1.0 indica que todos os julgamentos são perfeitamente satisfeitos; valores menores indicam que alguns julgamentos são apenas parcialmente satisfeitos. Busca-se o vetor de pesos que maximiza λ.'
  },
  {
    id: 'ranking',
    question: 'Como a plataforma calcula o ranking final?',
    answer: 'O ranking é calculado em três etapas: (1) Os pesos dos critérios são obtidos da matriz de comparação par a par; (2) As avaliações das alternativas são normalizadas; (3) A pontuação final de cada alternativa é a soma ponderada: Σ(peso_critério × desempenho_normalizado). A alternativa com maior pontuação é a vencedora.'
  },
];

export default function EducationalPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5 text-primary" />
          Material Educativo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {educationalContent.map((item) => (
            <AccordionItem key={item.id} value={item.id}>
              <AccordionTrigger className="text-left text-sm">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
