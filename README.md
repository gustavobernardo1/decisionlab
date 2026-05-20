# DecisionLab

**DecisionLab** é uma plataforma computacional em desenvolvimento para apoio à tomada de decisão sob incerteza, vinculada ao projeto de Iniciação Científica **“Tomada de decisão sob o ponto de vista da teoria de incertezas”**, desenvolvido no Instituto de Matemática e Estatística da Universidade Federal de Goiás.

A proposta da aplicação é reunir, em um ambiente interativo, métodos estudados na pesquisa para modelagem, comparação e análise de problemas de Tomada de Decisão Multiatributo.

Versão web

A versão web da plataforma será disponibilizada posteriormente.

Quando publicada, o link ficará disponível aqui:

https://decisionlabproject.vercel.app
---

## Sobre o projeto

Em muitos problemas reais, a escolha entre alternativas depende de múltiplos critérios e envolve julgamentos humanos, que podem carregar subjetividade, imprecisão e diferentes graus de preferência.

O DecisionLab busca transformar esses julgamentos em estruturas matemáticas analisáveis, permitindo que o usuário:

- cadastre critérios e alternativas;
- realize comparações par a par;
- calcule pesos ou vetores de prioridade;
- analise a consistência dos julgamentos;
- compare diferentes métodos de obtenção de pesos;
- visualize o ranqueamento final das alternativas.

---

## Métodos estudados

A plataforma está sendo desenvolvida a partir dos métodos estudados na Iniciação Científica, incluindo:

- Processo Hierárquico Analítico (PHA/AHP);
- método do autovetor principal;
- método da média geométrica;
- método de programação linear;
- extensões fuzzy do PHA;
- método fuzzy lambda-max;
- análise de consistência;
- representação de julgamentos incertos por números fuzzy triangulares.

---

## Funcionalidades previstas

A aplicação organiza o processo decisório em etapas:

1. **Configuração do problema**  
   Cadastro do objetivo, critérios e alternativas.

2. **Comparação par a par**  
   Preenchimento da matriz de julgamentos entre critérios.

3. **Cálculo dos pesos**  
   Aplicação dos métodos estudados para obter o vetor de prioridades.

4. **Avaliação das alternativas**  
   Atribuição de notas ou valores para cada alternativa em relação aos critérios.

5. **Resultados**  
   Visualização do ranking final, gráficos comparativos e medidas de consistência.

6. **Comparação entre métodos**  
   Análise da estabilidade dos resultados obtidos por diferentes métodos.

---

## Estado atual

Este repositório contém um **protótipo em desenvolvimento** da plataforma DecisionLab.

A versão atual ainda está em fase de implementação e validação dos métodos matemáticos. Novas funcionalidades, melhorias de interface e ajustes conceituais serão adicionados ao longo do desenvolvimento da pesquisa.

---

## Tecnologias utilizadas

A aplicação está sendo desenvolvida com:

- Next.js;
- React;
- TypeScript;
- Tailwind CSS;
- shadcn/ui;
- Recharts.

---

## Como executar localmente

Clone o repositório:

bash
git clone https://github.com/gustavobernardo1/decisionlab.git

Acesse a pasta do projeto:

cd decisionlab

Instale as dependências:

npm install

Execute o servidor de desenvolvimento:

npm run dev

Abra no navegador:

http://localhost:3000
