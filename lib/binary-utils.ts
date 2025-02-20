export const ACCEPTED_BINARY_TYPES = {
  "application/pdf": ".pdf",
  "application/json": ".json",
  "text/plain": ".txt",
  "text/csv": ".csv",
  "application/xml": ".xml",
  "image/jpeg": ".jpg,.jpeg",
  "image/png": ".png",
  "image/gif": ".gif",
  "application/zip": ".zip",
  "application/x-yaml": ".yaml,.yml",
  "application/octet-stream": "*",
} as const;

export interface BinaryFileData {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  content: string; // Base64 encoded content
}

export async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        // Remove data URL prefix if present
        const base64 = reader.result.split(",")[1] || reader.result;
        resolve(base64);
      } else {
        reject(new Error("Failed to read file as base64"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function getAcceptedFileTypes(): string {
  return Object.values(ACCEPTED_BINARY_TYPES).join(",");
}

export function isValidFileType(file: File): boolean {
  const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
  return Object.values(ACCEPTED_BINARY_TYPES).some(
    (types) => types === "*" || types.split(",").includes(fileExtension)
  );
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
