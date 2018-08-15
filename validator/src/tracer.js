import * as jaeger from "jaeger-client";
import {JAEGER_AGENT_HOST, TRACING_ENABLED} from "./config";

const tracer = (TRACING_ENABLED) ? jaeger.initTracer({
  serviceName : "sambot-verifier",
  sampler : {
    type : "const",
    param : 1,
  },
  reporter : {
    logSpans : true,
    agentHost : JAEGER_AGENT_HOST,
  },
}) : null;

const spans = [];

export const initTracer = async (name, traceInfo, fn, completionFn) => {
  if (!TRACING_ENABLED)
    return runFn(null, fn).then(completionFn);

  const spanContext = tracer.extract("text_map", JSON.parse(traceInfo));
  const span = tracer.startSpan(name, {
    childOf: spanContext
  });
  try {
    await runFn(span, fn);
    return tracer.close(completionFn);
  } finally {
    console.log("Finished last span", spans.length);
  }
};

export const trace = (name, fn) => {
  if (!TRACING_ENABLED)
    return runFn(null, fn);

  let span = tracer.startSpan(name, {
    childOf: spans[spans.length - 1].context(),
  });
  return runFn(span, fn);
};

async function runFn(span, fn) {
  if (!span)
    return fn();

  spans.push(span);

  let result;
  try {
    result = fn(span, tracer);
    if (result instanceof Promise) {
      return result.then((results) => {
        spans.pop().finish();
        return results;
      });
    }
    else {
      return result;
    }
  } finally {
    if (!(result instanceof Promise)) {
      spans.pop().finish();
    }
  }
}

export async function closeTracer() {
  if (tracer === null)
    return Promise.resolve();
  spans.forEach(span => span.finish());
  return new Promise((acc) => tracer.close(acc));
}