# n8n — Workflow Automation

## Quick Start

```bash
# From the monorepo root:
docker compose -f n8n/docker-compose.yml up -d

# Or if the house-network already exists:
docker compose -f n8n/docker-compose.yml up -d
```

## Access

- **Web UI:** http://localhost:5678
- **Webhook URL:** Each workflow gets a unique webhook URL
- **API:** http://localhost:5678/rest/

## Workflows

Export workflows to `n8n/workflows/` for version control:

1. Build the workflow in the n8n UI
2. Go to Workflow → Settings → Download
3. Save to `n8n/workflows/{workflow-name}.json`

## Phase 1 Workflow

- `purchase-order-auto-v1`: Stock Low → Create PO → WhatsApp → Wait Confirm → Wait Ready → Notify Delivery

## Integration

The Event Dispatcher (Cloud Function) sends events to n8n at:

```
POST http://n8n-host:5678/webhook/house-event
Headers:
  Authorization: Bearer {N8N_API_KEY}
  X-House-Signature: HMAC-SHA256(...)
  X-House-Tenant: {tenantId}
  Idempotency-Key: {eventId}
```
