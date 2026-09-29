export const MODEL_CATALOG = [
  {
    provider: "openai",
    company: "OpenAI",
    model: "gpt-5.1",
    tier: "high",
    strengths: ["code_generation", "security_analysis", "complex_reasoning"],
    costRank: 3,
    supportsJson: true,
    supportsStrictSafety: true,
    deployment: "hosted"
  },
  {
    provider: "anthropic",
    company: "Anthropic",
    model: "claude-sonnet-4.5",
    tier: "high",
    strengths: ["long_context", "policy_reasoning", "technical_writing"],
    costRank: 3,
    supportsJson: true,
    supportsStrictSafety: true,
    deployment: "hosted"
  },
  {
    provider: "google",
    company: "Google",
    model: "gemini-2.5-flash",
    tier: "medium",
    strengths: ["data_analytics", "summarization", "fast_reasoning"],
    costRank: 2,
    supportsJson: true,
    supportsStrictSafety: true,
    deployment: "hosted"
  },
  {
    provider: "openrouter",
    company: "OpenRouter",
    model: "qwen/qwen3-coder",
    tier: "low",
    strengths: ["summarization", "casual", "classification"],
    costRank: 1,
    supportsJson: true,
    supportsStrictSafety: false,
    deployment: "hosted"
  },
  {
    provider: "self_hosted",
    company: "Internal",
    model: "vllm-qwen3-14b",
    tier: "medium",
    strengths: ["confidential_data", "code_generation", "data_analytics"],
    costRank: 2,
    supportsJson: true,
    supportsStrictSafety: true,
    deployment: "private"
  }
];

export function findModel({ provider, model }) {
  return MODEL_CATALOG.find((candidate) => {
    return candidate.provider === provider && candidate.model === model;
  });
}

