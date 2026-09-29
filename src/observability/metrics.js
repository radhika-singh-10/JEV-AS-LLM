const metrics = {
  requestsTotal: 0,
  blockedTotal: 0,
  providerCalls: {},
  routeTiers: {},
  latencyMs: []
};

export function recordRequest({ decision, latencyMs }) {
  metrics.requestsTotal += 1;
  metrics.latencyMs.push(latencyMs);

  if (!decision.allowRequest) {
    metrics.blockedTotal += 1;
  }

  metrics.providerCalls[decision.provider] = (metrics.providerCalls[decision.provider] ?? 0) + 1;
  metrics.routeTiers[decision.routeTier] = (metrics.routeTiers[decision.routeTier] ?? 0) + 1;
}

export function getMetricsSnapshot() {
  const sortedLatency = [...metrics.latencyMs].sort((a, b) => a - b);
  const p95Index = Math.max(0, Math.ceil(sortedLatency.length * 0.95) - 1);

  return {
    ...metrics,
    p95LatencyMs: sortedLatency[p95Index] ?? 0
  };
}

export function resetMetrics() {
  metrics.requestsTotal = 0;
  metrics.blockedTotal = 0;
  metrics.providerCalls = {};
  metrics.routeTiers = {};
  metrics.latencyMs = [];
}
