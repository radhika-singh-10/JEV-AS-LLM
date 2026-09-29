export class ProviderRegistry {
  constructor({ policy, providerClients = {} }) {
    this.policy = policy;
    this.providerClients = providerClients;
  }

  getProvider(providerName) {
    const providerConfig = this.policy.providers[providerName];
    if (!providerConfig?.enabled) {
      throw new Error(`Provider is not enabled: ${providerName}`);
    }

    return this.providerClients[providerName] ?? new MockProviderClient(providerConfig, providerName);
  }
}

class MockProviderClient {
  constructor(providerConfig, providerName) {
    this.providerConfig = providerConfig;
    this.providerName = providerName;
  }

  async complete({ prompt, decision, requestId }) {
    const response = [
      `Mock response from ${this.providerConfig.company} / ${this.providerConfig.model}.`,
      `Request ${requestId} was handled as ${decision.intent} with ${decision.routeTier} routing.`,
      `Prompt preview: "${prompt.slice(0, 120)}${prompt.length > 120 ? "..." : ""}"`
    ].join("\n");

    return {
      providerResponse: {
        provider: this.providerName,
        model: this.providerConfig.model,
        latencyMs: estimateLatency(decision.routeTier),
        tokensIn: Math.ceil(prompt.length / 4),
        tokensOut: Math.ceil(response.length / 4)
      },
      text: response
    };
  }
}

function estimateLatency(routeTier) {
  if (routeTier === "high") return 1800;
  if (routeTier === "medium") return 850;
  if (routeTier === "low") return 320;
  return 0;
}
