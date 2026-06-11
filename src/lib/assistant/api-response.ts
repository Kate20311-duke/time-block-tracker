import { NextResponse } from "next/server";

export type AssistantApiErrorCode =
  | "RATE_LIMITED"
  | "INVALID_INPUT"
  | "UNAUTHORIZED"
  | "INTERNAL_ERROR";

export function assistantErrorResponse(params: {
  status: number;
  error: AssistantApiErrorCode;
  message: string;
  resetAt?: number;
}): NextResponse {
  return NextResponse.json(
    {
      error: params.error,
      message: params.message,
      ...(params.resetAt !== undefined ? { resetAt: params.resetAt } : {}),
    },
    { status: params.status },
  );
}

export function assistantJsonResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}
