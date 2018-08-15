
export const JAEGER_AGENT_HOST = process.env.JAEGER_AGENT_HOST || null;
export const TRACING_ENABLED = (JAEGER_AGENT_HOST !== null);
