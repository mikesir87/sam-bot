import {processRequest} from "../src/processRequest";

describe("processRequest.js", () => {

  let headers = {}, request = {}, supportingProcessor, otherProcessor, verifyFn;
  let validateDetails = {
    sourceRepoUrl : "SOURCE_REPO_URL",
    sourceBranch : "SOURCE_BRANCH",
    sourceCommitId : "SOURCE_COMMIT_ID",
    targetRepoUrl : "TARGET_REPO_URL",
    targetBranch : "TARGET_BRANCH",
  };

  beforeEach(() => {
    otherProcessor = {
      supports : jasmine.createSpy("otherProcessor.supports").and.returnValue(false)
    };

    supportingProcessor = {
      supports : jasmine.createSpy("supportingProcessor.supports").and.returnValue(true),
      validate : jasmine.createSpy("supportingProcessor.validate").and.returnValue(validateDetails),
      postComment : jasmine.createSpy("supportingProcessor.postComment").and.returnValue(Promise.resolve({ success : true })),
      mergeRequest : jasmine.createSpy("supportingProcessor.mergeRequest").and.returnValue(Promise.resolve({ success : true })),
    };

    verifyFn = jasmine.createSpy("yamlVerificationFn").and.returnValue(Promise.resolve({}));
  });

  it("throws an error message if no supported process found", async () => {
    try {
      await processRequest(headers, request, [otherProcessor], verifyFn);
      fail("should have thrown");
    } catch (err) {
      expect(err.errorCode).toBe(500);
      expect(err.message).toEqual("No processor found for incoming request");
      expect(otherProcessor.supports).toHaveBeenCalledWith(headers, request);
    }
  });

  it("posts comment when processor's validation fails", async () => {
    supportingProcessor.validate = jasmine.createSpy("failingValidate").and.throwError("Failure");
    const response = await processRequest(headers, request, [supportingProcessor], verifyFn);
    expect(response.success).toBe(true);
    expect(supportingProcessor.supports).toHaveBeenCalledWith(headers, request);
    expect(supportingProcessor.validate).toHaveBeenCalledWith(headers, request);
    expect(supportingProcessor.postComment).toHaveBeenCalledWith("Failure", request);
  });

  it("merges and posts a comment when everything succeeds", async () => {
    verifyFn = jasmine.createSpy("verifyFn").and.returnValue(Promise.resolve({}));

    await processRequest(headers, request, [ supportingProcessor ], verifyFn);
    expect(supportingProcessor.supports).toHaveBeenCalledWith(headers, request);
    expect(supportingProcessor.validate).toHaveBeenCalledWith(headers, request);
    expect(supportingProcessor.mergeRequest).toHaveBeenCalledWith(request);
    expect(supportingProcessor.postComment).toHaveBeenCalledWith("Auto-merged due to verification success", request);
  });

  it("posts a comment when yaml verification fails", async () => {
    verifyFn = jasmine.createSpy("verifyFn").and.throwError("Error");

    await processRequest(headers, request, [ supportingProcessor ], verifyFn);
    expect(supportingProcessor.supports).toHaveBeenCalledWith(headers, request);
    expect(supportingProcessor.validate).toHaveBeenCalledWith(headers, request);
    expect(supportingProcessor.postComment).toHaveBeenCalledWith("Error", request);
    expect(supportingProcessor.mergeRequest).not.toHaveBeenCalledWith(request);
  });

  it("posts a comment when merging fails", async () => {
    supportingProcessor.mergeRequest = jasmine.createSpy("failingMergeRequest").and.throwError("Merge failure");

    await processRequest(headers, request, [ supportingProcessor ], verifyFn);
    expect(supportingProcessor.supports).toHaveBeenCalledWith(headers, request);
    expect(supportingProcessor.validate).toHaveBeenCalledWith(headers, request);
    expect(supportingProcessor.mergeRequest).toHaveBeenCalledWith(request);
    expect(supportingProcessor.postComment).toHaveBeenCalledWith("Verification succeeded, but an error occurred during attempt to auto-merge: Merge failure", request);
  });

});
