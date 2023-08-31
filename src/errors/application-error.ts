export default class ApplicationError extends Error {
  public message: string
  public status: number

  constructor(message: string = 'ApplicationError', status: number = 500) {
    // Pass the message to the parent constructor (Error)
    super(message)

    // Save the "this" reference
    Object.setPrototypeOf(this, ApplicationError.prototype)

    // Capture the stack trace
    Error.captureStackTrace(this, this.constructor)

    // Set message and status
    this.message = message
    this.status = status
  }
}
