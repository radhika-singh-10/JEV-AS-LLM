export function validateRouteRequest(body) {
  const errors = [];

  if (!body || typeof body !== "object") {
    errors.push("Request body must be a JSON object");
  }

  if (typeof body?.prompt !== "string" || body.prompt.trim().length === 0) {
    errors.push("prompt must be a non-empty string");
  }

  if (body?.metadata !== undefined && typeof body.metadata !== "object") {
    errors.push("metadata must be an object when provided");
  }

  return {
    ok: errors.length === 0,
    errors
  };
}
