import {ErrorMessage} from "./errorMessage";
import {findProcessor, verifyYaml} from "./tracingOverrides";

export async function processRequest(requestContext,
                                     findProcessorFn = findProcessor,
                                     yamlVerificationFn = verifyYaml) {

  let processor = findProcessorFn(requestContext);

  if (processor === undefined)
    throw new ErrorMessage(500, "No processor found for incoming request");

  // Validate the request and get details (clone URLs, branches, etc.)
  try {
    requestContext.repoDetails = await processor.validate(requestContext);
  } catch (e) {
    return (e.requiresComment) ? processor.postComment(e.message, requestContext) : null;
  }

  // Start container for actual validation. If validation fails, its Promise is rejected (thrown).
  try {
    await yamlVerificationFn(requestContext);
  } catch (e) {
    return processor.postComment(e.message, requestContext);
  }

  // Now merge!
  try {
    await processor.mergeRequest(requestContext);
    await processor.postComment(`Auto-merged due to verification success`, requestContext);
  } catch (e) {
    return processor.postComment(`Verification succeeded, but an error occurred during attempt to auto-merge: ${e.message}`, requestContext);
  }

}
