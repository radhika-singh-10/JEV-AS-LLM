const MODERATION_RULES = [
  {
    category: "self_harm",
    severity: "high",
    pattern: /\b(kill myself|suicide|self harm|hurt myself)\b/i
  },
  {
    category: "violence",
    severity: "high",
    pattern: /\b(how to make a bomb|assassinate|shoot up|poison someone)\b/i
  },
  {
    category: "cyber_abuse",
    severity: "high",
    pattern: /\b(steal credentials|bypass login|exfiltrate|malware|ransomware)\b/i
  },
  {
    category: "harassment",
    severity: "medium",
    pattern: /\b(slur|humiliate them|destroy their reputation)\b/i
  },
  {
    category: "regulated_advice",
    severity: "medium",
    pattern: /\b(medical diagnosis|legal loophole|insider trading|tax evasion)\b/i
  }
];

export function moderateContent(text) {
  const matches = MODERATION_RULES.filter((rule) => rule.pattern.test(text));
  const highestSeverity = matches.some((match) => match.severity === "high")
    ? "high"
    : matches.some((match) => match.severity === "medium")
      ? "medium"
      : "low";

  return {
    allowed: highestSeverity !== "high",
    severity: highestSeverity,
    categories: matches.map((match) => match.category),
    reason: matches.length
      ? `Matched moderation categories: ${matches.map((match) => match.category).join(", ")}`
      : "No moderation issues detected"
  };
}

