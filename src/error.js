export class FibPayoutError extends Error {
  constructor(message, statusCode, body) {
    super(message);
    this.name = 'FibPayoutError';
    this.statusCode = statusCode;
    this.body = body;
  }
}