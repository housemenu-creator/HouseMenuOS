/** Environment-aware configuration for portal-hub */

export const PIPELINE_API_URL =
  import.meta.env.VITE_PIPELINE_API_URL ||
  'https://us-central1-house-menuapp.cloudfunctions.net/pipelineStatus'

export const HEALTH_API_URL =
  import.meta.env.VITE_HEALTH_API_URL ||
  'https://us-central1-house-menuapp.cloudfunctions.net/health'

export const FORWARD_EVENT_URL =
  import.meta.env.VITE_FORWARD_EVENT_URL ||
  'https://us-central1-house-menuapp.cloudfunctions.net/forwardEvent'
