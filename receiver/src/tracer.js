import * as jaeger from "jaeger-client";

export const tracer = jaeger.initTracer({
  serviceName : "sambot",
  sampler : {
    type : "const",
    param : 1,
  },
  reporter : {
    logSpans : true,
    agentHost : "jaeger",
  },
});

export const tracerMiddleware = (req, res, next) => {
  const spans = [];
  const rootSpan = tracer.startSpan("request", {
    tags : {
      url : req.originalUrl,
      method : req.method,
      ip : req.ip,
    }
  });

  spans.push(rootSpan);

  req.startTrace = (name, fn) => {
    let newSpan = tracer.startSpan(name, {
      childOf: spans[spans.length - 1].context(),
    });
    spans.push(newSpan);

    let result;
    try {
      result = fn(newSpan, tracer);
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
  };

  res.on("finish", () => {
    rootSpan.finish();
  });

  next();
};
