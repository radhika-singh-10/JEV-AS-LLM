import { JevLlmHarness } from "./harness.js";

const harness = new JevLlmHarness();

export async function routeRequest(rawPrompt) {
  return harness.route({ prompt: rawPrompt });
}
