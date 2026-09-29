import http from "node:http";
import { getAuditEvents } from "./audit/auditLog.js";
import { loadPolicy } from "./config/policy.js";
import { JevLlmHarness } from "./harness.js";
import { getMetricsSnapshot } from "./observability/metrics.js";
import { logger } from "./observability/logger.js";
import { validateRouteRequest } from "./validators/requestValidator.js";

const policy = loadPolicy();
const harness = new JevLlmHarness({ policy });
const port = Number(process.env.PORT ?? 8080);
const host = process.env.HOST ?? "127.0.0.1";

export function createServer({ policyConfig = policy, harnessInstance = harness } = {}) {
  return http.createServer(async (request, response) => {
    try {
      if (request.method === "GET" && request.url === "/healthz") {
        return sendJson(response, 200, {
          status: "ok",
          service: policyConfig.service
        });
      }

      if (request.method === "GET" && request.url === "/metrics") {
        return sendJson(response, 200, getMetricsSnapshot());
      }

      if (request.method === "GET" && request.url === "/audit") {
        return sendJson(response, 200, { events: getAuditEvents() });
      }

      if (request.method === "POST" && request.url === "/v1/route") {
        const body = await readJsonBody(request);
        const validation = validateRouteRequest(body);
        if (!validation.ok) {
          return sendJson(response, 400, { errors: validation.errors });
        }

        const result = await harnessInstance.route({
          prompt: body.prompt,
          metadata: body.metadata ?? {},
          requestId: body.requestId
        });
        return sendJson(response, 200, result);
      }

      return sendJson(response, 404, { error: "Not found" });
    } catch (error) {
      logger.error("server_error", { error: error.message });
      return sendJson(response, 500, { error: "Internal server error" });
    }
  });
}

export function startServer({ server = createServer(), hostName = host, portNumber = port } = {}) {
  server.listen(portNumber, hostName, () => {
    logger.info("server_started", { host: hostName, port: portNumber, service: policy.service });
  });
  return server;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  startServer();
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(JSON.stringify(payload, null, 2));
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
