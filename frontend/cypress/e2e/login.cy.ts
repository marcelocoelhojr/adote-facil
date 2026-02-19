describe('Login de usuario', () => {
  beforeEach(() => {
    cy.visit('/login')
  })

  // Cenario principal: login com credenciais validas
  it('deve fazer login e redirecionar para area logada', () => {
    cy.intercept('POST', '**/login').as('loginRequest')

    cy.get('input[name="email"]').type('teste@email.com')
    cy.get('input[name="password"]').type('12345678')

    cy.get('button[type="submit"]').click()

    cy.wait('@loginRequest').its('response.statusCode').should('eq', 201)
    cy.url().should('include', '/area_logada/animais_disponiveis')
  })

  // Cenario alternativo 1: credenciais invalidas
  it('deve exibir alerta com credenciais invalidas', () => {
    cy.intercept('POST', '**/login').as('loginRequest')

    cy.get('input[name="email"]').type('naoexiste@email.com')
    cy.get('input[name="password"]').type('senhaerrada')

    cy.on('window:alert', (message) => {
      expect(message).to.include('inválido')
    })

    cy.get('button[type="submit"]').click()

    cy.wait('@loginRequest').its('response.statusCode').should('not.eq', 201)
  })

  // Cenario alternativo 2: senha curta demais
  it('deve exibir erro de validacao com senha menor que 8 caracteres', () => {
    cy.get('input[name="email"]').type('teste@email.com')
    cy.get('input[name="password"]').type('123')

    cy.get('button[type="submit"]').click()

    cy.contains('mínimo 8 caracteres').should('be.visible')
    cy.url().should('include', '/login')
  })
})
