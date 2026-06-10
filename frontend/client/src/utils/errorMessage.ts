export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function getResponseMessage(message: unknown, fallback: string) {
  if (Array.isArray(message)) {
    const firstMessage = message.find((item) => typeof item === 'string' && item.trim());
    return firstMessage || fallback;
  }

  return typeof message === 'string' && message.trim() ? message : fallback;
}
