import { NextResponse } from "next/server";

import { isScopedAccessError } from "@/lib/db/scoped-errors";
import { enrichIcsPreviewWithImportCheck } from "@/lib/import/ics-import-enrich.server";
import { summarizeImportChecks } from "@/lib/import/duplicate-detection";
import { IcsParseError, parseIcsPreview } from "@/lib/import/ics-parse";
import { validateIcsUploadFile } from "@/lib/import/ics-upload";
import { ensureDbUser, getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function errorResponse(
  status: number,
  error: string,
  message: string,
): NextResponse {
  return NextResponse.json({ error, message }, { status });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return errorResponse(401, "UNAUTHORIZED", "Unauthorized");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse(400, "INVALID_FORM", "Invalid multipart form data");
  }

  const fileValue = formData.get("file");
  if (!(fileValue instanceof File)) {
    return errorResponse(400, "MISSING_FILE", "Missing ICS file");
  }

  const validation = validateIcsUploadFile(fileValue);
  if (validation === "missing") {
    return errorResponse(400, "MISSING_FILE", "Missing ICS file");
  }
  if (validation === "too_large") {
    return errorResponse(400, "FILE_TOO_LARGE", "ICS file is too large");
  }
  if (validation === "invalid_type") {
    return errorResponse(400, "INVALID_FILE_TYPE", "File must be .ics");
  }

  let icsText: string;
  try {
    icsText = await fileValue.text();
  } catch {
    return errorResponse(400, "READ_FAILED", "Could not read uploaded file");
  }

  const categoryId = String(formData.get("categoryId") ?? "").trim();

  try {
    const preview = parseIcsPreview(icsText, fileValue.name || "upload.ics");

    if (!categoryId) {
      return NextResponse.json({
        ...preview,
        summary: {
          ...preview.summary,
          importCheck: null,
        },
      });
    }

    const dbUser = await ensureDbUser(user);
    const events = await enrichIcsPreviewWithImportCheck(
      dbUser.id,
      categoryId,
      preview.events,
    );

    return NextResponse.json({
      ...preview,
      events,
      summary: {
        ...preview.summary,
        importCheck: summarizeImportChecks(events),
      },
    });
  } catch (error) {
    if (isScopedAccessError(error)) {
      return errorResponse(400, "INVALID_CATEGORY", "Invalid category");
    }
    if (error instanceof IcsParseError) {
      const message =
        error.code === "empty" ? "ICS file is empty" : "Invalid ICS file";
      return errorResponse(400, error.code.toUpperCase(), message);
    }
    return errorResponse(500, "PARSE_FAILED", "Failed to parse ICS file");
  }
}
