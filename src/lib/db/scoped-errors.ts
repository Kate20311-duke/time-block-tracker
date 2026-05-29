/** Thrown when a record does not exist or is not owned by the given user. */
export class ScopedAccessError extends Error {
  readonly code = "not_owned" as const;

  constructor(message = "Record not found or not owned by current user") {
    super(message);
    this.name = "ScopedAccessError";
  }
}

export function isScopedAccessError(error: unknown): error is ScopedAccessError {
  return error instanceof ScopedAccessError;
}
