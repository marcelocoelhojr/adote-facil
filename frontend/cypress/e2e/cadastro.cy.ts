describe('Cadastro de usuario', () => {
  beforeEach(() => {
    cy.visit('/cadastro')
  })

  // Cenario principal: cadastro com dados validos
  it('deve cadastrar um novo usuario e redirecionar para login', () => {
    const timestamp = Date.now()

    cy.intercept('POST', '**/users').as('registerUser')

    cy.get('input[name="name"]').type('Joao')
    cy.get('input[name="email"]').type(`joao${timestamp}@email.com`)
    cy.get('input[name="password"]').type('12345678')
    cy.get('input[name="confirmPassword"]').type('12345678')

    cy.on('window:alert', (message) => {
      expect(message).to.include('Cadastro efetuado com sucesso')
    })

    cy.get('button[type="submit"]').click()

    cy.wait('@registerUser').its('response.statusCode').should('eq', 201)
    cy.url().should('include', '/login')
  })

  // Cenario alternativo 1: senhas nao coincidem
  it('deve exibir erro quando as senhas nao coincidem', () => {
    cy.get('input[name="name"]').type('Joao')
    cy.get('input[name="email"]').type('joao@email.com')
    cy.get('input[name="password"]').type('12345678')
    cy.get('input[name="confirmPassword"]').type('senhadiferente')

    cy.get('button[type="submit"]').click()

    cy.contains('As senhas não coincidem').should('be.visible')
    cy.url().should('include', '/cadastro')
  })

  // Cenario alternativo 2: campos obrigatorios vazios
  it('deve exibir erros de validacao com campos vazios', () => {
    cy.get('button[type="submit"]').click()

    cy.contains('obrigatório').should('be.visible')
    cy.url().should('include', '/cadastro')
  })
})
