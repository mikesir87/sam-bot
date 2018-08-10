import {processRequest} from "../src/processRequest";
import {ValidationError} from "../src/validationError";

describe("processRequest.js", () => {

  let headers = {}, body = {}, requestContext = {}, processor, verifyFn;
  let validateDetails = {
    sourceRepoUrl : "SOURCE_REPO_URL",
    sourceBranch : "SOURCE_BRANCH",
    sourceCommitId : "SOURCE_COMMIT_ID",
    targetRepoUrl : "TARGET_REPO_URL",
    targetBranch : "TARGET_BRANCH",
  };

  beforeEach(() => {
    processor = {
      validate : jasmine.createSpy("supportingProcessor.validate").and.returnValue(validateDetails),
      postComment : jasmine.createSpy("supportingProcessor.postComment").and.returnValue(Promise.resolve({ success : true })),
      mergeRequest : jasmine.createSpy("supportingProcessor.mergeRequest").and.returnValue(Promise.resolve({ success : true })),
    };

    verifyFn = jasmine.createSpy("yamlVerificationFn").and.returnValue(Promise.resolve({}));
    requestContext = { headers, body };
  });

  it("throws an error message if no supported process found", async () => {
    try {
      await processRequest({ headers, body }, () => undefined, verifyFn);
      fail("should have thrown");
    } catch (err) {
      expect(err.errorCode).toBe(500);
      expect(err.message).toEqual("No processor found for incoming request");
    }
  });

  it("posts comment when processor's validation error indicates comment should be created", async () => {
    processor.validate = () => { throw new ValidationError("Failure", true) };
    await processRequest(requestContext, () => processor);
    expect(processor.postComment).toHaveBeenCalledWith("Failure", requestContext);
  });

  it("doesn't post comment when processor's validation error indicates comment should not be created", async () => {
    processor.validate = jasmine.createSpy("failingValidate").and.callFake(() => { throw new ValidationError("Failure", false) });
    await processRequest(requestContext, () => processor);
    expect(processor.validate).toHaveBeenCalledWith(requestContext);
    expect(processor.postComment).not.toHaveBeenCalled();
  });

  it("merges and posts a comment when everything succeeds", async () => {
    verifyFn = jasmine.createSpy("verifyFn").and.returnValue(Promise.resolve({}));

    await processRequest(requestContext, () => processor, verifyFn);
    expect(processor.validate).toHaveBeenCalledWith(requestContext);
    expect(processor.mergeRequest).toHaveBeenCalledWith(requestContext);
    expect(processor.postComment).toHaveBeenCalledWith("Auto-merged due to verification success", requestContext);
  });

  it("posts a comment when yaml verification fails", async () => {
    verifyFn = jasmine.createSpy("verifyFn").and.throwError("Error");

    await processRequest(requestContext, () => processor, verifyFn);
    expect(processor.validate).toHaveBeenCalledWith(requestContext);
    expect(processor.postComment).toHaveBeenCalledWith("Error", requestContext);
    expect(processor.mergeRequest).not.toHaveBeenCalledWith(requestContext);
  });

  it("posts a comment when merging fails", async () => {
    processor.mergeRequest = jasmine.createSpy("failingMergeRequest").and.throwError("Merge failure");

    await processRequest(requestContext, () => processor, verifyFn);
    expect(processor.validate).toHaveBeenCalledWith(requestContext);
    expect(processor.mergeRequest).toHaveBeenCalledWith(requestContext);
    expect(processor.postComment).toHaveBeenCalledWith("Verification succeeded, but an error occurred during attempt to auto-merge: Merge failure", requestContext);
  });

});
