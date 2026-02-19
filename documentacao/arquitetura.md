# Arquitetura de Software — Adote Facil

## Arquitetura adotada

O Adote Facil segue uma **arquitetura em camadas (Layered Architecture)** dentro de um modelo **cliente-servidor**. O sistema e dividido em tres grandes blocos — frontend, backend e banco de dados — cada um rodando em seu proprio container Docker, orquestrados pelo Docker Compose.

No backend, o codigo esta organizado em camadas inspiradas na Clean Architecture:

- **Controllers** (`src/controllers/`) — recebem as requisicoes HTTP, extraem os dados e devolvem as respostas. Nao possuem regra de negocio.
- **Services** (`src/services/`) — concentram toda a logica de negocio. Recebem suas dependencias por injecao de construtor, o que facilita os testes unitarios com mocks.
- **Repositories** (`src/repositories/`) — fazem o acesso ao banco usando Prisma ORM. Se um dia o banco mudar, so essa camada precisa ser alterada.
- **Providers** (`src/providers/`) — funcionalidades transversais como autenticacao JWT e hash de senhas com bcrypt.

No frontend, a estrutura segue o padrao do Next.js 15 (App Router): paginas em `src/app/`, componentes reutilizaveis em `src/components/` e chamadas HTTP centralizadas em `src/api/` usando Axios.

### Por que essa arquitetura?

- **Separacao clara**: cada camada tem uma responsabilidade unica. Um controller nunca acessa o banco diretamente, e um repository nunca conhece HTTP.
- **Testabilidade**: como os services recebem dependencias por construtor, basta injetar mocks nos testes sem precisar subir banco de dados.
- **Independencia de deploy**: frontend e backend sao containers separados, entao podem ser atualizados e escalados de forma independente.
- **Manutenibilidade**: novos desenvolvedores conseguem entender o fluxo rapidamente porque o padrao de camadas e bastante conhecido no mercado.

---

## Diagrama de componentes

```
+-----------------------------------------------------------------------+
|                          DOCKER COMPOSE                               |
|                                                                       |
|  +-----------------------------+     +-----------------------------+  |
|  |    FRONTEND (:3000)         |     |     BACKEND (:8080)         |  |
|  |    Next.js 15 / React 19   |     |     Node.js / Express       |  |
|  |                             |     |                             |  |
|  |  +--- Pages (App Router)   |     |  +--- Controllers           |  |
|  |  |                         |     |  |    (user, animal, chat)   |  |
|  |  +--- Components           |     |  |                          |  |
|  |  |    (cards, forms, chat) |     |  +--- Services               |  |
|  |  |                         |     |  |    (regras de negocio)    |  |
|  |  +--- API Layer (Axios) ---|---->|  |                          |  |
|  |  |                    REST |     |  +--- Repositories           |  |
|  |  +--- Context / State      |     |  |    (Prisma ORM)          |  |
|  |       (React Context)      |     |  |                          |  |
|  |                             |     |  +--- Providers             |  |
|  +-----------------------------+     |       (JWT, bcrypt)         |  |
|                                      +-------------+--------------+  |
|                                                    |                 |
|                                      +-------------v--------------+  |
|                                      |   POSTGRESQL (:5432)       |  |
|                                      |   User, Animal,            |  |
|                                      |   AnimalImage, Chat,       |  |
|                                      |   UserMessage              |  |
|                                      +----------------------------+  |
+-----------------------------------------------------------------------+
```

### Diagrama de pacotes — Backend

```
routes.ts
    |
    v
middlewares/  (autenticacao JWT)
    |
    v
controllers/
  user/  |  animal/  |  chat/
    |         |          |
    v         v          v
services/
  user/  |  animal/  |  chat/      <-- testes unitarios (*.spec.ts)
    |         |          |
    v         v          v
repositories/
  user.ts | animal.ts | chat.ts | animal-image.ts | user-message.ts
    |
    v
database.ts  (Prisma Client)
    |
    v
PostgreSQL
```

Dependencias transversais usadas pelos services:
- `providers/authenticator.ts` — geracao/validacao de tokens JWT
- `providers/encrypter.ts` — hash de senhas com bcrypt
