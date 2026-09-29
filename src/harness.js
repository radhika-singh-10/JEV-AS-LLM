import { recordAuditEvent } from "./audit/auditLog.js";
import { loadPolicy } from "./config/policy.js";
import { applyInputGuardrails, applyOutputGuardrails } from "./guardrails.js";
import { JevDecisionLayer } from "./jevDecisionLayer.js";
import { moderateContent } from "./moderation.js";
import { recordRequest } from "./observability/metrics.js";
import { logger } from "./observability/logger.js";
import { ProviderRegistry } from "./providers/providerRegistry.js";
import { createRequestId } from "./utils/id.js";

export class JevLlmHarness {
  constructor({ policy = loadPolicy(), decisionLayer, providerRegistry } = {}) {
    this.policy = policy;
    this.decisionLayer = decisionLayer ?? new JevDecisionLayer({ policy });
    this.providerRegistry = providerRegistry ?? new ProviderRegistry({ policy });
  }

  async route({ prompt, metadata = {}, requestId = createRequestId() }) {
    const startedAt = Date.now();
    const inputGuardrails = applyInputGuardrails(prompt, this.policy);
    const moderation = moderateContent(inputGuardrails.safeText, this.policy);
    const decision = this.decisionLayer.decide({
      text: inputGuardrails.safeText,
      moderation,
      guardrailState: inputGuardrails,
      metadata
    });

    if (decision.confidence < this.policy.routing.confidenceFloor && decision.allowRequest) {
      decision.routeTier = "high";
      decision.reason += " Low decision confidence triggered high-capability fallback.";
    }

    let llmResult = {
      providerResponse: null,
      text: "Request blocked before model execution."
    };

    if (decision.allowRequest) {
      const provider = this.providerRegistry.getProvider(decision.provider);
      llmResult = await provider.complete({
        prompt: inputGuardrails.safeText,
        decision,
        requestId,
        metadata
      });
    }

    const outputGuardrails = applyOutputGuardrails(llmResult.text, this.policy);
    const totalLatencyMs = Date.now() - startedAt;

    const result = {
      requestId,
      input: {
        originalLength: prompt.length,
        sanitizedPrompt: inputGuardrails.safeText,
        guardrailViolations: inputGuardrails.violations
      },
      moderation,
      decision,
      llm: llmResult.providerResponse,
      output: outputGuardrails,
      telemetry: {
        totalLatencyMs,
        service: this.policy.service
      }
    };

    recordRequest({ decision, latencyMs: totalLatencyMs });
    recordAuditEvent({
      requestId,
      intent: decision.intent,
      provider: decision.provider,
      routeTier: decision.routeTier,
      allowed: decision.allowRequest,
      moderationSeverity: moderation.severity,
      guardrailViolationTypes: inputGuardrails.violations.map((violation) => violation.type)
    });
    logger.info("request_routed", {
      requestId,
      intent: decision.intent,
      provider: decision.provider,
      routeTier: decision.routeTier,
      allowed: decision.allowRequest,
      totalLatencyMs
    });

    return result;
  }
}
