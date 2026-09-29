import { MODEL_CATALOG } from "./modelCatalog.js";

const INTENT_PATTERNS = [
  ["security_analysis", /\b(vulnerability|cve|exploit|sast|sbom|malware|threat|policy violation)\b/i],
  ["code_generation", /\b(code|function|bug|refactor|typescript|python|java|api|unit test)\b/i],
  ["data_analytics", /\b(csv|sql|dashboard|metric|latency|reliability|trend|chart|analytics)\b/i],
  ["summarization", /\b(summarize|summary|brief|rewrite|explain)\b/i],
  ["sensitive_advice", /\b(legal|medical|visa|immigration|tax|financial)\b/i],
  ["casual", /.*/]
];

export class JevDecisionLayer {
  constructor({ policy = null } = {}) {
    this.policy = policy;
  }

  decide({ text, moderation, guardrailState }) {
    const intent = classifyIntent(text);
    const confidentiality = classifyConfidentiality(text, guardrailState);
    const riskLevel = classifyRisk({ intent, moderation, guardrailState });
    const routeTier = chooseRouteTier({
      intent,
      riskLevel,
      confidentiality,
      guardrailState,
      policy: this.policy
    });
    const model = chooseModel({
      intent,
      routeTier,
      confidentiality,
      guardrailState,
      policy: this.policy
    });
    const confidence = scoreConfidence({ intent, riskLevel, moderation, guardrailState });

    return {
      allowRequest: moderation.allowed,
      intent,
      riskLevel,
      confidentiality,
      routeTier,
      provider: model?.provider ?? "none",
      company: model?.company ?? "none",
      model: model?.model ?? "none",
      confidence,
      probabilities: buildProbabilities(routeTier, confidence),
      reason: buildReason({ intent, riskLevel, confidentiality, routeTier, model, moderation, guardrailState })
    };
  }
}

function classifyIntent(text) {
  return INTENT_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0] ?? "casual";
}

function classifyConfidentiality(text, guardrailState) {
  if (guardrailState.hasSecret) return "secret";
  if (/\b(customer|internal|proprietary|source code|private repo|wipro|deloitte|truist|veracode)\b/i.test(text)) {
    return "internal";
  }
  return "public";
}

function classifyRisk({ intent, moderation, guardrailState }) {
  if (!moderation.allowed) return "blocked";
  if (guardrailState.hasPromptInjection || moderation.severity === "medium") return "high";
  if (["security_analysis", "sensitive_advice", "code_generation"].includes(intent)) return "medium";
  return "low";
}

function chooseRouteTier({ intent, riskLevel, confidentiality, guardrailState, policy }) {
  if (riskLevel === "blocked") return "blocked";
  if (confidentiality === "secret" || confidentiality === "internal") return "medium";
  if ((policy?.guardrails?.forceHighSafetyOnPromptInjection ?? true) && guardrailState.hasPromptInjection) {
    return "high";
  }
  if (riskLevel === "high") return "high";
  if (policy?.routing?.intentTierOverrides?.[intent]) return policy.routing.intentTierOverrides[intent];
  if (["security_analysis", "code_generation"].includes(intent)) return "high";
  if (intent === "data_analytics" || intent === "sensitive_advice") return "medium";
  return "low";
}

function chooseModel({ intent, routeTier, confidentiality, guardrailState, policy }) {
  if (routeTier === "blocked") return null;

  if (confidentiality !== "public") {
    return selectPolicyProvider(policy, "self_hosted") ?? MODEL_CATALOG.find((model) => model.provider === "self_hosted");
  }

  if (guardrailState.hasPromptInjection) {
    return MODEL_CATALOG.find((model) => model.tier === "high" && model.supportsStrictSafety);
  }

  return MODEL_CATALOG.find((model) => {
    return model.tier === routeTier && model.strengths.includes(intent);
  }) ?? MODEL_CATALOG.find((model) => model.tier === routeTier);
}

function selectPolicyProvider(policy, providerName) {
  const provider = policy?.providers?.[providerName];
  if (!provider?.enabled) return null;
  return {
    provider: providerName,
    company: provider.company,
    model: provider.model,
    tier: provider.tier,
    deployment: provider.deployment,
    strengths: []
  };
}

function scoreConfidence({ intent, riskLevel, moderation, guardrailState }) {
  let confidence = 0.88;
  if (intent === "casual") confidence -= 0.08;
  if (riskLevel === "high") confidence -= 0.12;
  if (moderation.categories.length > 0) confidence -= 0.1;
  if (guardrailState.hasPromptInjection) confidence -= 0.18;
  return Number(Math.max(0.51, confidence).toFixed(2));
}

function buildProbabilities(routeTier, confidence) {
  if (routeTier === "blocked") {
    return { blocked: confidence, high: 0.04, medium: 0.03, low: 0.02 };
  }

  const base = { high: 0.12, medium: 0.12, low: 0.12 };
  base[routeTier] = confidence;
  return base;
}

function buildReason({ intent, riskLevel, confidentiality, routeTier, model, moderation, guardrailState }) {
  if (!moderation.allowed) return `Blocked before LLM call: ${moderation.reason}.`;

  const parts = [
    `Intent classified as ${intent}.`,
    `Risk is ${riskLevel}.`,
    `Confidentiality is ${confidentiality}.`,
    `Selected ${routeTier} route${model ? ` using ${model.company} ${model.model}` : ""}.`
  ];

  if (guardrailState.hasPromptInjection) {
    parts.push("Prompt injection signal forced a safer route.");
  }

  if (guardrailState.hasSecret) {
    parts.push("Secrets were redacted and request stayed on private infrastructure.");
  }

  return parts.join(" ");
}
