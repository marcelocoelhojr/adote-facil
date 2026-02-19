import jwt from 'jsonwebtoken'

export class Authenticator {
  private secret = process.env.JWT_SECRET || 'secret'

  generateToken(payload: object): string {
    return jwt.sign(payload, this.secret, { expiresIn: '1h' })
  }

  validateToken<T = object>(token: string): T | null {
    const secret = process.env.JWT_SECRET || 'secret'

    try {
      return jwt.verify(token, secret) as T
    } catch (err) {
      const error = err as Error
      console.log({ error })
      return null
    }
  }
}

export const authenticatorInstance = new Authenticator()
