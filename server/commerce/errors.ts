export class CommerceError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'CommerceError'
    this.status = status
  }
}

export function isCommerceError(error: unknown): error is CommerceError {
  return error instanceof CommerceError
}
