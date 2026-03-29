# Workspace do TCC

Aplicação full-stack em Next.js para organizar projetos, tarefas, sprints, calendário e acompanhamento do desenvolvimento do TCC em um único workspace.

## Desenvolvimento local

1. Configure as variáveis a partir de `./.env.example`.
2. Gere o client do Prisma: `npm run db:generate`
3. Rode as migrations locais: `npm run db:migrate`
4. Popule dados de desenvolvimento: `npm run db:seed:dev`
5. Suba a aplicação: `npm run dev`

## Seeds

- `npm run db:seed:dev`: dados fake e contas locais para desenvolvimento
- `npm run db:seed:prod`: bootstrap mínimo e seguro para produção

`npm run db:seed` sem alvo explícito falha por segurança.

## Produção

A estratégia de produção, variáveis de ambiente, migrations e deploy em Netlify + Supabase estão documentados em `./docs/production-readiness.md`.
