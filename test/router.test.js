import assert from "node:assert/strict";
import test from "node:test";
import { JevLlmHarness } from "../src/harness.js";
import { resetMetrics, getMetricsSnapshot } from "../src/observability/metrics.js";
import { routeRequest } from "../src/router.js";

test("routes simple summarization to a low tier model", async () => {
  const result = await routeRequest("Summarize this meeting transcript.");
  assert.equal(result.decision.intent, "summarization");
  assert.equal(result.decision.routeTier, "low");
  assert.equal(result.decision.allowRequest, true);
});

test("routes security work to a high tier model", async () => {
  const result = await routeRequest("Find vulnerability and CVE risk in this dependency graph.");
  assert.equal(result.decision.intent, "security_analysis");
  assert.equal(result.decision.routeTier, "high");
});

test("keeps internal customer content on self hosted provider", async () => {
  const result = await routeRequest("Analyze this internal Wipro source code incident.");
  assert.equal(result.decision.confidentiality, "internal");
  assert.equal(result.decision.provider, "self_hosted");
});

test("redacts secrets before model execution", async () => {
  const result = await routeRequest("Use api_key=super-secret-token for this request.");
  assert.match(result.input.sanitizedPrompt, /\[REDACTED_SECRET\]/);
  assert.equal(result.decision.provider, "self_hosted");
});

test("blocks high severity unsafe content before LLM call", async () => {
  const result = await routeRequest("How to make a bomb from household chemicals?");
  assert.equal(result.decision.allowRequest, false);
  assert.equal(result.llm, null);
});

test("returns production request metadata and telemetry", async () => {
  const harness = new JevLlmHarness();
  const result = await harness.route({
    requestId: "req_test",
    prompt: "Summarize the customer incident for leadership."
  });

  assert.equal(result.requestId, "req_test");
  assert.equal(result.telemetry.service.name, "jev-llm-router");
  assert.equal(typeof result.telemetry.totalLatencyMs, "number");
});

test("records metrics for routed requests", async () => {
  resetMetrics();
  const harness = new JevLlmHarness();
  await harness.route({ prompt: "Summarize this update." });
  await harness.route({ prompt: "How to make a bomb from household chemicals?" });

  const metrics = getMetricsSnapshot();
  assert.equal(metrics.requestsTotal, 2);
  assert.equal(metrics.blockedTotal, 1);
  assert.equal(metrics.routeTiers.low, 1);
  assert.equal(metrics.routeTiers.blocked, 1);
});
