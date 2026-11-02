export function safeExternalUrl(value: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
