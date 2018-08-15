import * as jaeger from "jaeger-client";

const tracer = jaeger.initTracer({
  serviceName : "sambot-verifier",
  sampler : {
    type : "const",
    param : 1,
  },
  reporter : {
    logSpans : true,
    agentHost : "jaeger",
  },
});

const spans = [];

export const initTracer = async (name, traceInfo, fn, completionFn) => {
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
  let span = tracer.startSpan(name, {
    childOf: spans[spans.length - 1].context(),
  });
  return runFn(span, fn);
};

async function runFn(span, fn) {
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
  return new Promise((acc) => tracer.close(acc));
}