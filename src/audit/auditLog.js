const events = [];
const MAX_EVENTS = 200;

export function recordAuditEvent(event) {
  const auditEvent = {
    timestamp: new Date().toISOString(),
    ...event
  };

  events.push(auditEvent);
  if (events.length > MAX_EVENTS) {
    events.shift();
  }

  return auditEvent;
}

export function getAuditEvents() {
  return [...events];
}
