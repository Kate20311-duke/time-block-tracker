/** Maximum ICS upload size (bytes). Below typical Vercel body limits. */
export const MAX_ICS_UPLOAD_BYTES = 4 * 1024 * 1024;

const ICS_EXTENSIONS = [".ics", ".ical"];

export function isIcsFileName(fileName: string): boolean {
  const lower = fileName.trim().toLowerCase();
  return ICS_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function isIcsMimeType(mimeType: string): boolean {
  const lower = mimeType.trim().toLowerCase();
  return (
    lower === "text/calendar" ||
    lower === "application/ics" ||
    lower === "text/x-vcalendar"
  );
}

export function validateIcsUploadFile(file: File): "ok" | "missing" | "invalid_type" | "too_large" {
  if (!file || file.size === 0) {
    return "missing";
  }
  if (file.size > MAX_ICS_UPLOAD_BYTES) {
    return "too_large";
  }
  const nameOk = file.name ? isIcsFileName(file.name) : false;
  const mimeOk = file.type ? isIcsMimeType(file.type) : false;
  if (!nameOk && !mimeOk) {
    return "invalid_type";
  }
  return "ok";
}
