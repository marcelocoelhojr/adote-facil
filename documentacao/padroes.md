# Principios e Padroes de Projeto — Adote Facil

## Principios SOLID

### Single Responsibility (SRP)

Cada classe do projeto tem uma unica responsabilidade. O `CreateUserService` so cuida da logica de criacao de usuario, o `UserRepository` so faz acesso ao banco, o `Encrypter` so lida com hash de senha, e o `CreateUserController` so traduz HTTP para chamada de service.

Exemplo — o controller nao sabe nada de banco, e o service nao sabe nada de HTTP:

```typescript
// controllers/user/create-user.ts
class CreateUserController {
  constructor(private readonly createUser: CreateUserService) {}

  async handle(request: Request, response: Response): Promise<Response> {
    const { name, email, password } = request.body
    const result = await this.createUser.execute({ name, email, password })
    const statusCode = result.isFailure() ? 400 : 201
    return response.status(statusCode).json(result.value)
  }
}
```

```typescript
// services/user/create-user.ts
export class CreateUserService {
  constructor(
    private readonly encrypter: Encrypter,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(params: CreateUserDTO.Params): Promise<CreateUserDTO.Result> {
    const { name, email, password } = params
    const userAlreadyExists = await this.userRepository.findByEmail(email)
    if (userAlreadyExists) {
      return Failure.create({ message: 'Email já cadastrado.' })
    }
    const hashedPassword = this.encrypter.encrypt(password)
    const user = await this.userRepository.create({ name, email, password: hashedPassword })
    return Success.create(user)
  }
}
```

### Open/Closed (OCP)

Os services recebem dependencias pelo construtor. Se quisermos trocar o bcrypt por argon2, basta criar uma nova classe com os mesmos metodos `encrypt` e `compare` e injetar no lugar — sem alterar nenhuma linha do service.

```typescript
// providers/encrypter.ts — implementacao atual com bcrypt
export class Encrypter {
  encrypt(value: string): string {
    return bcrypt.hashSync(value, 10)
  }
  compare(value: string, hash: string): boolean {
    return bcrypt.compareSync(value, hash)
  }
}
```

Para estender, bastaria criar outra classe seguindo o mesmo contrato e trocar a instancia exportada.

### Liskov Substitution (LSP)

O tipo `Either<F, S>` e uma union de `Failure<F> | Success<S>`. Ambas as classes possuem os mesmos metodos (`isFailure`, `isSuccess`, `value`), entao qualquer codigo que recebe um `Either` funciona independente de qual das duas veio:

```typescript
// utils/either.ts
export type Either<F, S> = Failure<F> | Success<S>
```

No controller, o tratamento e o mesmo para qualquer resultado:

```typescript
const result = await this.createUser.execute({ name, email, password })
const statusCode = result.isFailure() ? 400 : 201
return response.status(statusCode).json(result.value)
```

### Interface Segregation (ISP)

As classes tem interfaces enxutas e focadas. O `Encrypter` so tem `encrypt` e `compare`. O `Authenticator` so tem `generateToken` e `validateToken`. Nenhuma classe e forcada a depender de metodos que nao usa.

Os DTOs tambem seguem esse principio — cada operacao define apenas os campos que precisa:

```typescript
// services/user/create-user.ts
namespace CreateUserDTO {
  export type Params = { name: string; email: string; password: string }
  export type Failure = { message: string }
  export type Success = User
  export type Result = Either<Failure, Success>
}
```

### Dependency Inversion (DIP)

Os services nunca acessam o Prisma, o bcrypt ou o jsonwebtoken diretamente. Eles dependem de abstracoes (`UserRepository`, `Encrypter`, `Authenticator`) que sao injetadas via construtor.

Isso fica claro nos testes: conseguimos mockar tudo sem precisar de banco de dados real:

```typescript
// services/user/create-user.spec.ts
describe('CreateUserService', () => {
  let sut: CreateUserService
  let encrypter: MockProxy<Encrypter>
  let userRepository: MockProxy<UserRepository>

  beforeAll(() => {
    encrypter = mock<Encrypter>()
    userRepository = mock<UserRepository>()
    sut = new CreateUserService(encrypter, userRepository)

    userRepository.findByEmail.mockResolvedValue(null)
    userRepository.create.mockResolvedValue({ id: '1' } as User)
    encrypter.encrypt.mockReturnValue('encrypted-password')
  })
})
```

Se as dependencias fossem concretas (ex: `bcrypt.hashSync` direto no service), esse tipo de teste nao seria possivel.

---

## Padroes de projeto identificados

### 1. Repository

Todas as entidades possuem um repository que encapsula o acesso ao banco. Os services nunca chamam o Prisma diretamente — sempre passam pelo repository.

```typescript
// repositories/user.ts
export class UserRepository {
  constructor(private readonly repository: PrismaClient) {}

  async create(params: CreateUserRepositoryDTO.Params): Promise<CreateUserRepositoryDTO.Result> {
    return this.repository.user.create({ data: params })
  }

  async findByEmail(email: string) {
    return this.repository.user.findUnique({ where: { email } })
  }

  async findById(id: string) {
    return this.repository.user.findUnique({ where: { id } })
  }

  async update(params: UpdateUserRepositoryDTO.Params) {
    return this.repository.user.update({
      where: { id: params.id },
      data: params.data,
    })
  }
}
```

O mesmo padrao se repete para `AnimalRepository`, `ChatRepository`, `AnimalImageRepository` e `UserMessageRepository`. Se o projeto migrasse de PostgreSQL para MongoDB, por exemplo, so os repositories precisariam mudar.

### 2. Singleton

Cada provider, repository, service e controller e instanciado uma unica vez e exportado como constante. Toda a aplicacao compartilha as mesmas instancias:

```typescript
// database.ts
export const prisma = new PrismaClient()

// providers/encrypter.ts
export const encrypterInstance = new Encrypter()

// repositories/user.ts
export const userRepositoryInstance = new UserRepository(prisma)

// services/user/create-user.ts
export const createUserServiceInstance = new CreateUserService(
  encrypterInstance,
  userRepositoryInstance,
)

// controllers/user/create-user.ts
export const createUserControllerInstance = new CreateUserController(
  createUserServiceInstance,
)
```

Isso forma uma cadeia de composicao: o `prisma` e injetado no repository, que e injetado no service, que e injetado no controller. Tudo instanciado uma unica vez.

### 3. Dependency Injection

O projeto usa injecao de dependencia via construtor em todas as camadas. Nenhuma classe instancia suas proprias dependencias internamente — todas recebem de fora.

```typescript
// O service recebe repository e encrypter pelo construtor
export class CreateUserService {
  constructor(
    private readonly encrypter: Encrypter,
    private readonly userRepository: UserRepository,
  ) {}
}

// O controller recebe o service pelo construtor
class CreateUserController {
  constructor(private readonly createUser: CreateUserService) {}
}
```

O beneficio pratico aparece nos testes unitarios. Como as dependencias sao injetadas, podemos substituir por mocks:

```typescript
encrypter = mock<Encrypter>()
userRepository = mock<UserRepository>()
sut = new CreateUserService(encrypter, userRepository)
```

Sem injecao de dependencia, seria necessario subir o banco de dados e usar bcrypt real para testar a logica de criacao de usuario.

---

## Padrao que poderia ser aplicado: Strategy

O projeto ja tem a estrutura para aplicar o padrao Strategy, mas nao faz isso explicitamente. O `Encrypter` usa bcrypt de forma fixa. Com o Strategy, poderiamos definir uma interface e trocar a implementacao em tempo de configuracao:

```typescript
// Definir uma interface explicita
interface EncrypterStrategy {
  encrypt(value: string): string
  compare(value: string, hash: string): boolean
}

// Implementacao com bcrypt
class BcryptEncrypter implements EncrypterStrategy {
  encrypt(value: string): string {
    return bcrypt.hashSync(value, 10)
  }
  compare(value: string, hash: string): boolean {
    return bcrypt.compareSync(value, hash)
  }
}

// Implementacao com argon2
class Argon2Encrypter implements EncrypterStrategy {
  encrypt(value: string): string { /* argon2 */ }
  compare(value: string, hash: string): boolean { /* argon2 */ }
}
```

O service continuaria recebendo `EncrypterStrategy` pelo construtor e nao precisaria saber qual algoritmo esta sendo usado. Hoje o codigo ja esta preparado para essa mudanca — so faltaria formalizar a interface.
