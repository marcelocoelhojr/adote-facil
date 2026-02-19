# Testes — Adote Facil

## 1. Analise dos testes unitarios existentes

O backend possui **11 testes unitarios** cobrindo todos os services dos 3 modulos (User, Animal, Chat). Usam Jest com `jest-mock-extended` para mockar repositorios e providers.

### O que funciona bem

- Cada service tem seu arquivo de teste correspondente (`*.spec.ts`)
- Dependencias sao mockadas via injecao de construtor, sem precisar de banco real
- Cobrem os caminhos de sucesso e as principais regras de negocio (email duplicado, senha invalida, auto-chat)

### Melhorias sugeridas

- **Testes de controller ausentes**: nenhum controller e testado. O mapeamento de status HTTP (400, 201, 500) so e verificado indiretamente. Adicionar testes que validem o `handle(req, res)` com requests mockados cobriria essa camada.
- **Cenarios de borda faltando**: os testes cobrem o caminho feliz e 1-2 falhas, mas nao testam entradas vazias, strings muito longas ou caracteres especiais.
- **Sem testes de integracao**: nenhum teste conecta ao banco real. Testes de integracao com um banco de teste (via Docker) validariam que as queries Prisma funcionam como esperado.
- **Coverage nao monitorado**: o script `test:coverage` existe mas nao e executado no CI. Integrar no pipeline garantiria que a cobertura nao caia.

---

## 2. Testes de aceitacao (Cypress)

Foram criados 3 arquivos de teste e2e com Cypress, cada um cobrindo um cenario principal e seus alternativos.

### Teste 1 — Cadastro de usuario (`cypress/e2e/cadastro.cy.ts`)

| Cenario | Descricao | O que valida |
|---------|-----------|-------------|
| **Principal** | Usuario preenche nome, email, senha e confirmacao com dados validos e submete o formulario | API retorna 201, alerta de sucesso aparece, redireciona para `/login` |
| **Alternativo 1** | Usuario digita senhas diferentes nos campos "Senha" e "Confirme a senha" | Mensagem "As senhas nao coincidem" aparece na tela, permanece em `/cadastro` |
| **Alternativo 2** | Usuario clica em "Cadastrar" sem preencher nenhum campo | Mensagens de campo obrigatorio aparecem, permanece em `/cadastro` |

### Teste 2 — Login de usuario (`cypress/e2e/login.cy.ts`)

| Cenario | Descricao | O que valida |
|---------|-----------|-------------|
| **Principal** | Usuario informa email e senha validos e submete | API retorna 201, redireciona para `/area_logada/animais_disponiveis` |
| **Alternativo 1** | Usuario informa email que nao existe no sistema | API retorna erro, alerta com mensagem de credencial invalida |
| **Alternativo 2** | Usuario digita senha com menos de 8 caracteres | Validacao client-side exibe erro "minimo 8 caracteres", nao chama a API |

### Teste 3 — Listagem de animais disponiveis (`cypress/e2e/animais-disponiveis.cy.ts`)

| Cenario | Descricao | O que valida |
|---------|-----------|-------------|
| **Principal** | Apos login, usuario acessa a pagina de animais disponiveis | Titulo "Animais disponiveis para adocao" esta visivel |
| **Alternativo 1** | Usuario clica em "Filtrar" e busca por nome | Dialog de filtro abre, campo de nome aceita input e formulario e submetido |
| **Alternativo 2** | Usuario tenta acessar `/area_logada/animais_disponiveis` sem estar autenticado | Middleware redireciona para `/login` |

---

## 3. Instrucoes de execucao

### Testes unitarios (backend)

```bash
# Rodar todos os testes
cd backend
npm test

# Rodar em modo watch (re-executa ao salvar)
npm run test:watch

# Rodar com relatorio de cobertura
npm run test:coverage
```

### Testes de aceitacao — Cypress (frontend)

**Pre-requisito**: a aplicacao precisa estar rodando (frontend na porta 3000 e backend na porta 8080).

```bash
# Subir a aplicacao com Docker
docker compose up -d

# OU rodar localmente
cd backend && npm run dev &
cd frontend && npm run dev &
```

Executar os testes:

```bash
cd frontend

# Modo interativo (abre o navegador do Cypress)
npm run cypress:open

# Modo headless (roda no terminal, ideal para CI)
npm run cypress:run
```

### Estrutura dos arquivos de teste

```
backend/src/services/
  user/
    create-user.spec.ts
    update-user.spec.ts
    user-login.spec.ts
  animal/
    create-animal.spec.ts
    get-available.spec.ts
    get-user.spec.ts
    update-animal-status.spec.ts
  chat/
    create-user-chat.spec.ts
    create-user-chat-message.spec.ts
    get-user-chat.spec.ts
    get-user-chats.spec.ts

frontend/cypress/e2e/
  cadastro.cy.ts
  login.cy.ts
  animais-disponiveis.cy.ts
```
