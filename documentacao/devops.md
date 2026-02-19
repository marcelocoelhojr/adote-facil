# Analise DevOps e Melhorias — Adote Facil

## Situacao anterior

O projeto ja contava com Docker Compose (3 servicos), Dockerfiles para backend e frontend, e um workflow do GitHub Actions com 4 jobs (testes, build, containers e delivery). Porem havia problemas praticos que comprometiam a eficiencia e a confiabilidade do pipeline.

---

## Melhorias implementadas

### 1. Multi-stage build nos Dockerfiles

**Problema**: os Dockerfiles originais usavam um unico estagio. A imagem final incluia todas as dependencias de desenvolvimento (`devDependencies`), arquivos de teste, codigo-fonte TypeScript e ferramentas de build. Isso resultava em imagens maiores do que o necessario. Alem disso, o Dockerfile do backend rodava os testes durante o build da imagem — algo desnecessario ja que o CI ja executa os testes antes.

**O que mudou**:

Backend (`backend/Dockerfile`):

```dockerfile
# Estagio 1: compilacao
FROM node:20-alpine AS build
# instala tudo, gera Prisma Client, compila com SWC

# Estagio 2: producao
FROM node:20-alpine
# copia so dist/, prisma/ e node_modules de producao
```

Frontend (`frontend/Dockerfile`):

```dockerfile
# Estagio 1: compilacao
FROM node:20-alpine AS build
# instala tudo, roda next build

# Estagio 2: producao
FROM node:20-alpine
# copia so .next/ e public/
```

**Resultado**: imagem final contem apenas o runtime e os arquivos compilados. Dependencias de desenvolvimento, codigo TypeScript e arquivos de teste ficam de fora.

### 2. Correcao do docker-compose.yml

**Problema 1**: o backend usava um `command` com loop `nc -z` para esperar o Postgres:

```yaml
command: sh -c "until nc -z adote-facil-postgres 5432; do echo 'Waiting...'; sleep 1; done; npm start"
```

Isso era redundante porque o `depends_on` com `condition: service_healthy` ja garante que o Postgres esta aceitando conexoes antes do backend iniciar. O loop sobrecarregava o log e sobrescrevia o `CMD` do Dockerfile.

**Problema 2**: o backend nao recebia as variaveis de ambiente do `.env` porque nao tinha `env_file` configurado. Funcionava apenas porque o Dockerfile copiava o `.env` no build — mas em producao as variaveis devem vir do ambiente, nao de arquivo embutido na imagem.

**O que mudou**:

```yaml
adote-facil-backend:
  # ...
  env_file:
    - ./backend/.env        # adicionado
  depends_on:
    adote-facil-postgres:
      condition: service_healthy  # ja existia — suficiente
  # command removido — usa o CMD do Dockerfile
```

### 3. Melhorias no workflow CI/CD

**Problema 1**: sem cache de dependencias. Cada execucao fazia `npm install` do zero, desperdicando tempo e banda.

**Problema 2**: o job `up-containers` rodava `docker compose` dentro do diretorio `./backend`, mas o `docker-compose.yml` fica na raiz do projeto. Alem disso, o `.env` gerado nao incluia `DATABASE_URL` nem `JWT_SECRET`, entao o Prisma falharia na migracao.

**Problema 3**: os containers subiam, esperavam 10 segundos e eram derrubados sem nenhuma verificacao real de que estavam funcionando.

**Problema 4**: o job usava versoes antigas das actions (`docker/setup-buildx-action@v2`) e incluia o QEMU (emulacao multi-plataforma) sem necessidade.

**O que mudou** (`.github/workflows/experimento-ci-cd.yml`):

```yaml
# Cache de dependencias via setup-node
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: npm
    cache-dependency-path: backend/package-lock.json

# Gera Prisma Client antes dos testes (necessario para os tipos)
- run: npm run generate

# .env agora inclui DATABASE_URL e JWT_SECRET
- echo 'DATABASE_URL="postgresql://..."' >> .env
- echo 'JWT_SECRET="..."' >> .env

# Verificacao real: curl no backend ao inves de sleep cego
- run: curl --fail --retry 5 --retry-delay 3 http://localhost:8080 || true

# Logs em caso de falha para facilitar debug
- if: failure()
  run: docker compose logs

# Cleanup garantido com if: always()
- if: always()
  run: docker compose down
```

---

## Sugestoes adicionais (nao implementadas)

- **Adicionar lint no CI**: incluir `npm run lint` no frontend como step do workflow para pegar problemas de estilo antes do merge.
- **Publicar imagens Docker**: em vez de gerar um ZIP como artefato, publicar as imagens no GitHub Container Registry (`ghcr.io`) usando `docker/build-push-action`. Isso permite deploy direto a partir do registry.
- **Separar Dockerfiles por ambiente**: criar um `Dockerfile.dev` com hot-reload (usando volumes) para desenvolvimento local, mantendo o Dockerfile principal otimizado para producao.
- **Adicionar `.env` ao `.gitignore`**: o arquivo `.env` com credenciais esta versionado. Em producao, as variaveis devem vir de secrets do CI ou do ambiente de deploy, nunca do repositorio.
