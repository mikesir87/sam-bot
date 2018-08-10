
export class ValidationError extends Error {
  constructor(message, requiresComment) {
    super(message);
    this.requiresComment = requiresComment;
  }
}