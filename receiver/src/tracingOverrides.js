import { processRequest as _processRequest } from "./processRequest";
import { findProcessor as _findProcessor } from "./processors/locator";
import { verifyYaml as _verifyYaml } from "./verifyYaml";
import {DockerClient} from "./dockerClient";
import {JAEGER_AGENT_HOST} from "./config";

export const processRequest = (rc) => {
  return startTraceIfPossible("processRequest", rc, () => _processRequest(rc));
};

export const findProcessor = (rc) => {
  const processor = startTraceIfPossible("findProcessor", rc, () => _findProcessor(rc));
  if (processor === undefined)
    return processor;

  // Override it so all processor calls are being traced
  return {
    getName: () => processor.getName().bind(processor),
    supports: (rc) => startTraceIfPossible("processor.supports", rc, () => processor.supports(rc)),
    validate: (rc) => startTraceIfPossible("processor.validate", rc, () => processor.validate(rc)),
    postComment:  (comment, rc) => startTraceIfPossible("processor.postComment", rc, () => processor.postComment(comment, rc)),
    mergeRequest: (rc) => startTraceIfPossible("processor.mergeRequest", rc, (span) => {
      span.addTags({ merged : true });
      return processor.mergeRequest(rc);
    }),
  };
};

export const verifyYaml = (rc) => {
  return startTraceIfPossible("verifyYaml", rc, () => {
    const defaultDockerClient = DockerClient;

    const overridenDockerClient = {
      pull : (imageName) => startTraceIfPossible("dockerClient.pull", rc, (span) => {
        if (span) {
          span.addTags({ imageName });
        }
        return defaultDockerClient.pull(imageName);
      }),
      run: (imageName, cmd, streams, createOptions) => startTraceIfPossible("dockerClient.run", rc, (span, tracer) => {
        if (span) {
          let httpCarrier = {};
          tracer.inject(span.context(), "text_map", httpCarrier);
          createOptions.Env.push(`TRACE_CONTEXT=${JSON.stringify(httpCarrier)}`);
          createOptions.Env.push(`JAEGER_AGENT_HOST=${JAEGER_AGENT_HOST}`);
          span.addTags({ imageName, env: createOptions.Env });
        }

        return defaultDockerClient.run(imageName, cmd, streams, createOptions);
      })
    };


    return _verifyYaml(rc, overridenDockerClient);
  })
};

function startTraceIfPossible(traceName, requestContext, fn) {
  if (requestContext.startTrace) {
      return requestContext.startTrace(traceName, (span, tracer) => {
        return fn(span, tracer);
      });
  }
  return fn();
}
