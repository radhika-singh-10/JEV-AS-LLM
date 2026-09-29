const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{12,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bghp_[A-Za-z0-9_]{20,}\b/g,
  /\b(?:password|secret|api[_-]?key)\s*[:=]\s*\S+/gi
];

const PROMPT_INJECTION_PATTERNS = [
  /ignore (all )?(previous|prior) instructions/i,
  /reveal (the )?(system prompt|developer message|hidden instructions)/i,
  /print your hidden policy/i,
  /disable (safety|guardrails|moderation)/i
];

export function applyInputGuardrails(text) {
  const violations = [];

  if (text.length > 12_000) {
    violations.push({
      type: "max_length",
      action: "route_to_long_context_or_reject",
      message: "Input is very large and needs a long-context or chunked route."
    });
  }

  if (SECRET_PATTERNS.some((pattern) => pattern.test(text))) {
    violations.push({
      type: "secret_detected",
      action: "redact_before_llm",
      message: "Potential secret detected and redacted before model execution."
    });
  }

  if (PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(text))) {
    violations.push({
      type: "prompt_injection",
      action: "force_high_safety_route",
      message: "Prompt injection pattern detected."
    });
  }

  return {
    safeText: redactSecrets(text),
    violations,
    hasPromptInjection: violations.some((violation) => violation.type === "prompt_injection"),
    hasSecret: violations.some((violation) => violation.type === "secret_detected")
  };
}

export function applyOutputGuardrails(text) {
  const redacted = redactSecrets(text);
  const blocked = /\bcredential theft steps|weapon construction steps\b/i.test(redacted);

  return {
    allowed: !blocked,
    text: blocked
      ? "The response was blocked by the output safety guardrail."
      : redacted,
    violations: blocked ? ["unsafe_output"] : []
  };
}

function redactSecrets(text) {
  return SECRET_PATTERNS.reduce((value, pattern) => value.replace(pattern, "[REDACTED_SECRET]"), text);
}

