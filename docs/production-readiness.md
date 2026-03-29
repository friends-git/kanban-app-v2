# Production Readiness

## Estratégia recomendada

- Banco gerenciado no Supabase, tratado apenas como PostgreSQL
- Prisma como camada de acesso e migrations
- `DATABASE_URL` apontando para a conexão pooled do Supabase, usada no runtime do app
- `DIRECT_URL` apontando para a conexão direta do Supabase, usada pelo Prisma CLI
- `prisma migrate deploy` como estratégia de produção
- seed de produção mínima, sem dados fake

## Variáveis de ambiente

### Desenvolvimento

- `DATABASE_URL`: banco local de desenvolvimento
- `DIRECT_URL`: pode ser igual ao `DATABASE_URL` local
- `SEED_DEFAULT_PASSWORD`: senha padrão apenas da seed fake de desenvolvimento

### Produção

- `DATABASE_URL`: string pooled do Supabase para runtime do app no Netlify. Recomendação: pooler na porta `6543` com `?pgbouncer=true&connection_limit=1`
- `DIRECT_URL`: string direta do Supabase para migrations e operações administrativas do Prisma. Se o ambiente não suportar a conexão direta, use o session pooler na porta `5432`
- `PROD_BOOTSTRAP_ADMIN_NAME`: nome do admin inicial real
- `PROD_BOOTSTRAP_ADMIN_EMAIL`: e-mail real do admin inicial
- `PROD_BOOTSTRAP_ADMIN_TITLE`: opcional
- `PROD_BOOTSTRAP_ADMIN_PASSWORD`: opcional. Se omitida, usa `Senha123!` e força troca no primeiro login

## Prisma

- O schema usa `url` + `directUrl` no datasource
- O `prisma.config.ts` aponta o Prisma CLI para `DIRECT_URL`
- Para desenvolvimento: `npm run db:migrate`
- Para produção: `npm run db:migrate:deploy`
- Não usar `db push` como fluxo principal de produção

## Seeds

### Desenvolvimento

`npm run db:seed:dev`

Cria contas locais, projetos, tarefas, sprints e dados demonstrativos.

### Produção

`npm run db:seed:prod`

Não cria dados fake. O comportamento é:

- sem variáveis de bootstrap: não cria nenhum dado operacional
- com `PROD_BOOTSTRAP_ADMIN_*`: cria apenas o admin inicial real

## Setup recomendado com Supabase

1. Crie o projeto Postgres no Supabase.
2. Copie a connection string pooled do Supavisor em transaction mode para `DATABASE_URL`.
3. Copie a connection string direta do banco para `DIRECT_URL`. Se o ambiente de migration não suportar a conexão direta, use o session pooler na porta `5432`.
4. Rode `npm run db:migrate:deploy` usando as variáveis de produção.
5. Opcionalmente rode `npm run db:seed:prod` para criar o admin inicial.

## Setup recomendado com Netlify

1. Conecte o repositório ao Netlify.
2. Configure as variáveis de produção no painel do site:
   - `DATABASE_URL`
   - `DIRECT_URL`
3. Se for usar bootstrap inicial, configure também:
   - `PROD_BOOTSTRAP_ADMIN_NAME`
   - `PROD_BOOTSTRAP_ADMIN_EMAIL`
   - `PROD_BOOTSTRAP_ADMIN_TITLE`
   - `PROD_BOOTSTRAP_ADMIN_PASSWORD` se quiser evitar a senha padrão
4. Use `npm run build` como build command.
5. Aplique as migrations antes do deploy final ou em etapa separada do pipeline com `npm run db:migrate:deploy`.
6. Não envie `.env` local para o Netlify. Toda credencial de produção deve ficar no painel de environment variables.

## Checklist antes do deploy final

- remover qualquer banco de produção que tenha recebido seed de desenvolvimento
- confirmar que o login em produção não exibe contas demo
- confirmar que não existem e-mails `@tcc.local` no banco de produção
- confirmar que o primeiro admin é um usuário real
- validar `npm run db:migrate:deploy` com a `DIRECT_URL` correta
- validar o runtime com `DATABASE_URL` pooled do Supabase
- validar login, troca obrigatória de senha e reset administrativo

## Limitações atuais a considerar

- equipes e sprints ainda não têm CRUD completo pela UI
- por isso, o bootstrap mínimo recomendado em produção é apenas o admin inicial
- se o grupo quiser equipes pré-carregadas, isso deve ser feito com dados reais por seed adicional ou inserção manual controlada
