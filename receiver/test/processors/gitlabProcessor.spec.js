import {GitLabProcessor} from "../../src/processors/gitlabProcessor";

describe("GitLab processor", () => {

  let processor, gitlabClient;
  const TOKEN = "a-super-secret-token";

  beforeEach(() => {
    gitlabClient = {

    };
    processor = new GitLabProcessor(TOKEN, gitlabClient);
  });

  describe("supports", () => {
    let headers;
    beforeEach(() => headers = {});

    it("doesn't support request if headers missing gitlab token", () => {
      expect(processor.supports(headers, null)).toBe(false);
    });

    it("doesn't support request if gitlab token in header does not match expected value", () => {
      headers["x-gitlab-token"] = "unexpected-value";
      expect(processor.supports(headers, null)).toBe(false);
    });

    it("doesn't support request if object kind not merge request", () => {
      headers["x-gitlab-token"] = TOKEN;
      const body = { object_kind : "comment" };
      expect(processor.supports(headers, body)).toBe(false);
    });

    it("doesn't support request if object attributes is undefined", () => {
      headers["x-gitlab-token"] = TOKEN;
      const body = { object_kind : "merge_request" };
      expect(processor.supports(headers, body)).toBe(false);
    });

    it("supports request if everything is included", () => {
      headers["x-gitlab-token"] = TOKEN;
      const body = { object_kind : "merge_request", object_attributes : {} };
      expect(processor.supports(headers, body)).toBe(true);
    });
  });

  describe("validate", () => {
    let body;

    beforeEach(() => {
      body = {
        object_attributes : {
          id: 234,
          state: "opened",
          source_branch: "dev",
          target_branch: "master",
          target_project_id: 123,
          target : { ssh_url : "target-ssh-url", },
          source : { ssh_url : "target-ssh-url", },
          last_commit: {
            id : "abcdef12",
          },
        },
      };
    });

    it("doesn't validate when state isn't open", async () => {
      body.object_attributes.state = "closed";
      try {
        await processor.validate({}, body);
        fail("Should have thrown");
      } catch (err) {
        expect(err).toEqual("Status not opened - closed");
      }
    });

    it("doesn't validate when target branch isn't master", async () => {
      body.object_attributes.target_branch = "dev";
      try {
        await processor.validate({}, body);
        fail("Should have thrown");
      } catch (err) {
        expect(err).toEqual("Can't auto-merge as MR not targeting master branch");
      }
    });

    it("doesn't validate if changes made to non-stack files", async () => {
      const changes = { changes : [{old_path : "README.md"}] };
      gitlabClient.getChanges = jasmine.createSpy("getChanges").and.returnValue(Promise.resolve(changes));
      try {
        await processor.validate({}, body);
        fail("Should have thrown");
      } catch (err) {
        expect(err).toContain("Changes to other file(s) detected");
      }
    });

    it ("validates when everything is set correctly", async () => {
      const changes = { changes : [{ old_path: "docker-stack.yml" }]};
      gitlabClient.getChanges = jasmine.createSpy("getChanges").and.returnValue(Promise.resolve(changes));
      const data = await processor.validate({}, body);
      expect(data.targetRepoUrl).toEqual(body.object_attributes.target.ssh_url);
      expect(data.targetBranch).toEqual(body.object_attributes.target_branch);
      expect(data.sourceRepoUrl).toEqual(body.object_attributes.source.ssh_url);
      expect(data.sourceBranch).toEqual(body.object_attributes.source_branch);
      expect(data.sourceCommitId).toEqual(body.object_attributes.last_commit.id);
    });

  });

  it("posts comments correctly", async () => {
    const body = {
      object_attributes : {
        id : 1,
        target_project_id : 123
      }
    };
    gitlabClient.postComment = jasmine.createSpy("postComment").and.returnValue(true);
    expect(await processor.postComment("My comment", body)).toBe(true);
    expect(gitlabClient.postComment).toHaveBeenCalledWith(123, 1, "My comment");
  });

  it("accepts merge requests correctly", async () => {
    const body = {
      object_attributes : {
        id : 1,
        last_commit : { id : "abcdef12" },
        target_project_id : 123
      }
    };
    gitlabClient.acceptMergeRequest = jasmine.createSpy("acceptMergeRequest").and.returnValue(true);
    expect(await processor.mergeRequest(body)).toBe(true);
    expect(gitlabClient.acceptMergeRequest).toHaveBeenCalledWith(123, 1, "abcdef12");
  });

});
