export const formatContent = (content: any, contentType: string): string => {
  if (contentType === "json") {
    try {
      return typeof content === "string"
        ? JSON.stringify(JSON.parse(content), null, 2)
        : JSON.stringify(content, null, 2);
    } catch {
      return String(content);
    }
  }
  return String(content);
};

export const getContentType = (headers: Record<string, string>): string => {
  const contentType = headers?.["content-type"]?.toLowerCase() || "";
  if (contentType.includes("application/json")) return "json";
  if (contentType.includes("text/html")) return "html";
  if (contentType.includes("text/xml")) return "xml";
  return "text";
};

export const getFormattedContent = (
  content: any,
  contentType: string
): string => {
  if (!content) return "";
  try {
    if (contentType === "json") {
      const jsonString =
        typeof content === "string" ? content : JSON.stringify(content);
      return JSON.stringify(JSON.parse(jsonString), null, 2);
    }
    return typeof content === "string" ? content : JSON.stringify(content);
  } catch (e) {
    return typeof content === "string" ? content : JSON.stringify(content);
  }
};
