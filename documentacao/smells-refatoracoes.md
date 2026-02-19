# Code Smells e Refatoracoes — Adote Facil

## Smell 1 — Codigo duplicado na conversao de imagens

Os services `GetAvailableAnimalsService` e `GetUserAnimalsService` tinham o mesmo bloco de codigo para converter imagens de `Buffer` para base64. Qualquer mudanca no formato de saida exigiria alterar os dois arquivos.

**Codigo original** (repetido em ambos os arquivos):

```typescript
// services/animal/get-available.ts (linhas 38-45)
// services/animal/get-user.ts (linhas 30-37)

const formattedAnimals = animals.map((animal) => {
  return {
    ...animal,
    images: animal.images.map((image) => {
      return image.imageData.toString('base64')
    }),
  }
})
```

**Smell**: Duplicated Code — logica identica copiada em dois services diferentes.

**Refatoracao aplicada**: extrair a funcao para um modulo compartilhado.

Arquivo criado — `services/animal/format-animal-images.ts`:

```typescript
type AnimalWithImages = {
  images: { imageData: Buffer }[]
  [key: string]: unknown
}

export function formatAnimalImages<T extends AnimalWithImages>(animals: T[]) {
  return animals.map((animal) => ({
    ...animal,
    images: animal.images.map((image) => image.imageData.toString('base64')),
  }))
}
```

Os dois services agora importam e usam a funcao:

```typescript
// services/animal/get-available.ts
import { formatAnimalImages } from './format-animal-images.js'

// ...
const formattedAnimals = formatAnimalImages(animals)
```

```typescript
// services/animal/get-user.ts
import { formatAnimalImages } from './format-animal-images.js'

// ...
const formattedAnimals = formatAnimalImages(animals)
```

---

## Smell 2 — Secret JWT duplicado e console.log no provider

No `Authenticator`, a leitura de `process.env.JWT_SECRET || 'secret'` aparecia duas vezes: uma como propriedade da classe e outra como variavel local dentro de `validateToken`. Alem disso, o `catch` fazia `console.log` do erro — informacao desnecessaria em producao que pode expor detalhes internos.

**Codigo original**:

```typescript
// providers/authenticator.ts

export class Authenticator {
  private secret = process.env.JWT_SECRET || 'secret'

  generateToken(payload: object): string {
    return jwt.sign(payload, this.secret, { expiresIn: '1h' })
  }

  validateToken<T = object>(token: string): T | null {
    const secret = process.env.JWT_SECRET || 'secret'  // duplicado

    try {
      return jwt.verify(token, secret) as T
    } catch (err) {
      const error = err as Error
      console.log({ error })  // log desnecessario
      return null
    }
  }
}
```

**Smells**:
- Duplicated Code — `process.env.JWT_SECRET || 'secret'` aparece duas vezes.
- Long-lived debug code — `console.log` de erro dentro de um fluxo esperado (token invalido e algo normal, nao precisa logar).

**Refatoracao aplicada**: reutilizar a propriedade `this.secret` que ja existe e remover o `console.log`.

```typescript
// providers/authenticator.ts (refatorado)

export class Authenticator {
  private readonly secret = process.env.JWT_SECRET || 'secret'

  generateToken(payload: object): string {
    return jwt.sign(payload, this.secret, { expiresIn: '1h' })
  }

  validateToken<T = object>(token: string): T | null {
    try {
      return jwt.verify(token, this.secret) as T
    } catch {
      return null
    }
  }
}
```

---

## Smell 3 — Controller de mensagem ignora resultado do Either

Todos os controllers do projeto verificam `result.isFailure()` para retornar o status HTTP correto (400 para erro de negocio, 201 para sucesso). O `CreateUserChatMessageController` era a excecao: retornava sempre 201, mesmo quando o service indicava falha (ex: enviar mensagem para si mesmo).

**Codigo original**:

```typescript
// controllers/chat/create-user-chat-message.ts

const result = await this.createUserChatMessage.execute({
  senderId: user?.id || '',
  receiverId,
  content,
})

return response.status(201).json(result)  // sempre 201, ignora falhas
```

Para comparacao, o padrao usado nos demais controllers:

```typescript
// controllers/user/create-user.ts (padrao correto)

const result = await this.createUser.execute({ name, email, password })
const statusCode = result.isFailure() ? 400 : 201
return response.status(statusCode).json(result.value)
```

**Smell**: Inconsistent error handling — um controller fora do padrao que mascara erros de negocio como sucesso.

**Refatoracao aplicada**: alinhar com o padrao dos demais controllers.

```typescript
// controllers/chat/create-user-chat-message.ts (refatorado)

const result = await this.createUserChatMessage.execute({
  senderId: user?.id || '',
  receiverId,
  content,
})

const statusCode = result.isFailure() ? 400 : 201

return response.status(statusCode).json(result.value)
```
