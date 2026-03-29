# UI Brief — Referência Notion para Projetos & Tarefas

## Objetivo

A interface do workspace deve se inspirar fortemente na experiência do Notion para gestão de projetos e tarefas, mantendo a identidade visual própria do sistema.

## O que queremos copiar como comportamento/estrutura

### 1. Projetos e Tarefas como databases com múltiplas views

Cada entidade deve ter múltiplas visões, por exemplo:

#### Projetos

- Ativos
- Cronograma
- Quadro
- Todos

#### Tarefas

- Por projeto
- Sprints
- Sprint atual
- Todas
- Quadro
- Por responsável

### 2. Visão em quadro

- colunas lado a lado
- scroll horizontal se necessário
- cards leves e legíveis
- drag and drop entre colunas
- persistência no banco

### 3. Visão em lista

- agrupamento por status, projeto, sprint ou responsável
- grupos expansíveis/recolhíveis
- linhas leves, com cara de database
- drag and drop dentro do grupo e entre grupos quando fizer sentido

### 4. Projetos com página própria

Ao abrir um projeto:
- abrir uma página completa
- topo com nome e propriedades
- descrição
- tasks relacionadas dentro da página
- criar nova task dentro do projeto
- possibilidade futura de abrir um side panel sem sair do contexto

### 5. Tarefas com página própria e drawer/sidebar

Ao clicar em tarefa:
- preferencialmente abrir drawer lateral
- também permitir página completa da tarefa
- manter o contexto do projeto/lista/board
- drawer rico, com:
  - propriedades
  - descrição
  - checklist
  - comentários

### 6. Criação rápida

#### Projeto

- botão novo projeto
- create flow leve
- após criar, abrir a página do projeto

#### Tarefa

- botão nova tarefa
- se criada dentro do projeto, herdar contexto do projeto
- abrir no drawer ou aparecer imediatamente na lista/board

### 7. Checklist de tarefa

Cada task deve ter:
- itens de checklist
- marcar/desmarcar
- progresso visual
- persistência real

### 8. Drag and drop

#### Projetos

- mover entre colunas do board
- atualizar status/ordem

#### Tarefas

- mover entre colunas/status
- mover entre agrupamentos quando fizer sentido
- persistir coluna/ordem/status

## O que NÃO copiar literalmente do Notion

- identidade visual neutra demais
- ausência de personalidade visual
- layout mobile do Notion
- qualquer elemento que conflite com o design do workspace

## O que adaptar ao nosso design

- CTA principal em Gold
- navegação/tabs em Violet
- dark/light mode
- cards com cantos suaves
- muito respiro
- visual premium/minimalista