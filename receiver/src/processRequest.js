import {gitlabProcessor} from "./gitlabProcessor";
import {ErrorMessage} from "./errorMessage";
import {verifyYaml} from "./verifyYaml";

const DEFAULT_PROCESSORS = [
    gitlabProcessor,
];

export async function processRequest(headers, request, processors = DEFAULT_PROCESSORS) {
  const processor = processors.find((p) => p.supports(headers, request));
  if (processor === undefined)
    throw new ErrorMessage(500, "No processor found for incoming request");

  // Validate the request and get details (clone URLs, branches, etc.)
  let details = null;
  try {
    details = await processor.validate(headers, request);
  } catch (e) {
    return processor.postComment(e.message, request);
  }

  // Start container for actual validation
  try {
    await verifyYaml(details.sourceRepoUrl, details.sourceBranch, details.sourceCommitId, details.targetRepoUrl, details.targetBranch);
  } catch (e) {
    return processor.postComment(e.message, request);
  }

  // Now merge!
  try {
    await processor.mergeRequest(request);
    await processor.postComment(`Auto-merged due to verification success`);
  } catch (e) {
    return processor.postComment(`Verification succeeded, but an error occurred during attempt to auto-merge: ${e.message}`, request);
  }

}
