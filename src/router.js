import { applyInputGuardrails, applyOutputGuardrails } from "./guardrails.js";
import { moderateContent } from "./moderation.js";
import { JevDecisionLayer } from "./jevDecisionLayer.js";
import { callMockLlm } from "./llmClient.js";

const decisionLayer = new JevDecisionLayer();

export async function routeRequest(rawPrompt) {
  const inputGuardrails = applyInputGuardrails(rawPrompt);
  const moderation = moderateContent(inputGuardrails.safeText);
  const decision = decisionLayer.decide({
    text: inputGuardrails.safeText,
    moderation,
    guardrailState: inputGuardrails
  });

  if (decision.confidence < 0.62 && decision.allowRequest) {
    decision.routeTier = "high";
    decision.reason += " Low decision confidence triggered high-capability fallback.";
  }

  const llmResult = await callMockLlm({
    prompt: inputGuardrails.safeText,
    decision
  });
  const outputGuardrails = applyOutputGuardrails(llmResult.text);

  return {
    input: {
      originalLength: rawPrompt.length,
      sanitizedPrompt: inputGuardrails.safeText,
      guardrailViolations: inputGuardrails.violations
    },
    moderation,
    decision,
    llm: llmResult.providerResponse,
    output: outputGuardrails
  };
}

