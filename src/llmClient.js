export async function callMockLlm({ prompt, decision }) {
  if (!decision.allowRequest) {
    return {
      providerResponse: null,
      text: "Request blocked before model execution."
    };
  }

  const response = [
    `Mock response from ${decision.company} / ${decision.model}.`,
    `The request was handled as ${decision.intent} with ${decision.routeTier} routing.`,
    `Prompt preview: "${prompt.slice(0, 120)}${prompt.length > 120 ? "..." : ""}"`
  ].join("\n");

  return {
    providerResponse: {
      provider: decision.provider,
      model: decision.model,
      latencyMs: estimateLatency(decision.routeTier),
      tokensIn: Math.ceil(prompt.length / 4),
      tokensOut: Math.ceil(response.length / 4)
    },
    text: response
  };
}

function estimateLatency(routeTier) {
  if (routeTier === "high") return 1800;
  if (routeTier === "medium") return 850;
  if (routeTier === "low") return 320;
  return 0;
}

