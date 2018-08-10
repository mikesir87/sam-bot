import {GitLabProcessor} from "./gitlabProcessor";

// As other processors are implemented, add them here
const DEFAULT_PROCESSORS = [
  new GitLabProcessor(),
];

export function findProcessor(requestContext,
                              processors = DEFAULT_PROCESSORS) {
  return processors.find((processor) => processor.supports(requestContext));
}
