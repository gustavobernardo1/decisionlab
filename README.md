# DecisionLab — Estúdio de decisões

Plataforma local para estruturar, comparar e explicar decisões multicritério. A interface está em português e funciona sem instalar bibliotecas externas. O percurso tem cinco etapas: Problema, Modelo, Julgamentos, Desempenho e Interpretação.

## Começar

1. Instale Node.js 20 ou mais recente.
2. Nesta pasta, execute `node server.js`.
3. Abra `http://127.0.0.1:4173` no navegador.

Se o Node.js já estiver configurado com npm, `npm start` também funciona. Para rodar os testes matemáticos, execute `npm test`.

Para publicar como site estático na Vercel, defina esta pasta como diretório raiz do projeto. `vercel.json` configura o projeto como estático e `npm run build` copia apenas os arquivos da aplicação para `dist/`. O servidor local não é necessário na hospedagem.

## O que está incluído

- Tela inicial com três casos prontos: **“Qual celular comprar?”**, **“Qual fornecedor escolher?”** e **“Onde morar durante a faculdade?”**. Os dois primeiros começam em AHP; o terceiro apresenta uma rede ANP. Cada caso traz pergunta fixa, três opções fictícias, critérios e desempenhos ilustrativos. Os julgamentos começam vazios para o estudante fazer a análise.
- Cada cartão de exemplo permite começar, continuar uma análise incompleta ou refazer o caso, sem apagar análises anteriores.
- Ao concluir o exemplo, a tela de interpretação oferece **Criar minha análise do zero**. Essa nova análise inicia sem critérios nem alternativas.
- Painel de análises com criação, duplicação e exclusão.
- Salvamento automático no `localStorage` do navegador.
- Importação e exportação de análises em JSON; exportação do ranking em CSV.
- Interface Estúdio de decisões: cartões de julgamento em azul e coral, percurso lateral de cinco etapas e layouts para desktop e celular.
- Mapa editável no início da etapa Modelo: hierarquia de objetivo, critérios selecionáveis e alternativas no AHP; rede de influências com setas curvas no ANP. A escolha AHP/ANP pode ser feita no próprio mapa.
- No celular, a hierarquia e o editor de critérios se organizam verticalmente; o desempenho das alternativas aparece em cartões com campos identificados, sem exigir rolagem horizontal da matriz.
- Julgamentos guiados, um par por vez: escolha o critério preferido, ajuste a intensidade de 1 a 9 e consulte a escala completa de Saaty ao lado. A intensidade 1 registra igualdade diretamente.
- Modelo AHP com comparações exatas ou fuzzy triangulares opcionais, autovetor principal no caso exato, média geométrica fuzzy no caso aproximado e razão de consistência.
- Modelo ANP de **um grupo de critérios**, com editor de influências, comparações locais exatas ou fuzzy, supermatriz estocástica e vetor limite.
- Avaliação das alternativas por notas de 0 a 10 ou por valores brutos normalizados em cada critério.
- Ranking, contribuições por critério, consistência e análise de sensibilidade dos pesos finais.
- Prévia do relatório com objetivo, ranking, pesos, desempenho, consistência, sensibilidade e método; opção de baixar HTML ou imprimir/salvar em PDF pelo navegador.
- Animações curtas para entrada dos julgamentos, barras do ranking e rede; respeitam a preferência por movimento reduzido do sistema.

## Definições metodológicas

Esta versão usa AHP ou ANP **para obter pesos dos critérios** e, em seguida, uma soma ponderada para pontuar as alternativas. Ela não implementa comparações par a par entre alternativas. O ANP está restrito a um grupo de critérios: relações de influência definem as colunas da supermatriz, e as alternativas entram depois como dados de desempenho. A rede ANP precisa ser fortemente conectada e ter ao menos uma autoinfluência para que a potência da supermatriz convirja ao vetor limite.

Em AHP e ANP, cada resposta usa a escala recíproca de Saaty de 1 a 9. O modo **Exato** registra um valor único. Em **Aproximado**, a plataforma transforma a intensidade escolhida em um número fuzzy triangular (intensidade adjacente inferior, valor escolhido, intensidade adjacente superior, com limites na escala). Em **Definir faixa**, o usuário escolhe os extremos plausíveis em torno do valor central. A comparação recíproca é gerada automaticamente. Julgamentos sem faixa permanecem exatos. Se houver ao menos uma faixa, as prioridades locais vêm da média geométrica fuzzy das linhas, normalização triangular aproximada e centroide normalizado. No AHP, essas prioridades são os pesos dos critérios. No ANP, os centroides normalizados de cada conjunto local preenchem uma supermatriz **pontual**, cujo limite fornece os pesos finais. Portanto, esta implementação não calcula uma supermatriz fuzzy nem intervalos fuzzy para o ranking. Os limites triangulares não são probabilidades nem intervalos de confiança. A razão de consistência é calculada na matriz dos valores centrais.

No modo **nota de 0 a 10**, 10 significa melhor desempenho em todos os critérios. No modo **valor bruto**, o menor e o maior valor de cada critério definem a escala relativa; critérios de custo são invertidos. Com valores idênticos, todas as alternativas recebem desempenho igual naquele critério.

A análise de sensibilidade varia cada peso final, redistribuindo os demais proporcionalmente. Ela **não** recalcula os julgamentos AHP/ANP. A razão de consistência usa índices aleatórios tabelados para até 10 critérios.

As bases metodológicas consultadas foram [Buckley (1985), sobre médias geométricas fuzzy](https://www.sciencedirect.com/science/article/pii/0165011485900909), e [Saaty, sobre a supermatriz do ANP](https://www.ejpam.com/ejpam/article/download/6/18/0). A combinação de prioridades locais fuzzy defuzzificadas com a supermatriz pontual é uma escolha explícita desta implementação.

## Dados e limites

Os dados ficam apenas no navegador utilizado. Limpar os dados do site pode apagar análises; exporte JSON para backup. Esta versão não possui conta, sincronização, colaboração, banco de dados nem publicação automática. Admite até 10 critérios e 25 alternativas por análise.

O código matemático é determinístico e tem testes de referência em `tests/math.test.js`. As opções e os valores dos exemplos são fictícios; não representam especificações ou preços de mercado. Para uso acadêmico formal ou decisões de alto impacto, valide a modelagem e os resultados com casos de referência da sua pesquisa.
