describe('Listagem de animais disponiveis', () => {
  beforeEach(() => {
    // Simula autenticacao: injeta token e dados do usuario
    cy.intercept('POST', '**/login').as('loginRequest')
    cy.visit('/login')

    cy.get('input[name="email"]').type('teste@email.com')
    cy.get('input[name="password"]').type('12345678')
    cy.get('button[type="submit"]').click()

    cy.wait('@loginRequest')
    cy.url().should('include', '/area_logada/animais_disponiveis')
  })

  // Cenario principal: visualizar animais disponiveis
  it('deve exibir a pagina de animais disponiveis apos login', () => {
    cy.contains('Animais disponíveis para adoção').should('be.visible')
  })

  // Cenario alternativo 1: filtrar animais por tipo
  it('deve abrir o filtro e aplicar busca', () => {
    cy.contains('Filtrar').should('be.visible')
    cy.contains('Filtrar').click()

    // Preenche campo de nome no formulario de filtro
    cy.get('input[name="name"]').type('Rex')
    cy.get('button[type="submit"]').click()
  })

  // Cenario alternativo 2: acesso sem autenticacao redireciona para login
  it('deve redirecionar para login ao acessar sem estar autenticado', () => {
    cy.clearCookies()
    cy.visit('/area_logada/animais_disponiveis')

    cy.url().should('include', '/login')
  })
})
