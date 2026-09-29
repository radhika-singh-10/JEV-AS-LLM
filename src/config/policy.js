import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_POLICY_PATH = path.resolve(__dirname, "../../config/policy.json");

export function loadPolicy(policyPath = process.env.POLICY_PATH ?? DEFAULT_POLICY_PATH) {
  const rawPolicy = fs.readFileSync(policyPath, "utf8");
  const policy = JSON.parse(rawPolicy);
  validatePolicy(policy);
  return policy;
}

function validatePolicy(policy) {
  const requiredTopLevelKeys = ["service", "routing", "guardrails", "providers"];
  for (const key of requiredTopLevelKeys) {
    if (!policy[key]) {
      throw new Error(`Policy is missing required key: ${key}`);
    }
  }

  if (typeof policy.routing.confidenceFloor !== "number") {
    throw new Error("Policy routing.confidenceFloor must be a number");
  }

  if (!Object.keys(policy.providers).length) {
    throw new Error("Policy must define at least one provider");
  }
}
