import secrets from "@cloudreach/docker-secrets";
import {GitlabClient} from "./gitlabClient";

const defaultGitlabClient = new GitlabClient(
    process.env.GITLAB_BASE_URL,
    secrets[process.env.GITLAB_SECRET_TOKEN_KEY],
);

export class GitLabProcessor {

  constructor(gitlabToken = secrets[process.env.GITLAB_WEBHOOK_SECRET_TOKEN_KEY],
              gitlabClient = defaultGitlabClient) {
    this.gitlabToken = gitlabToken;
    this.gitlabClient = gitlabClient;
  }

  /**
   * Does this processor support the incoming request?
   * @param headers A map of headers
   * @param body The webhook body
   * @returns {boolean} True if supported.
   */
  supports(headers, body) {
    return headers["x-gitlab-token"] !== undefined &&
        headers["x-gitlab-token"] === this.gitlabToken &&
        body.object_kind === "merge_request" &&
        body.object_attributes !== undefined;
  }

  /**
   * Now that we support the request, is it still valid to operate on?
   * @param headers The initial request headers
   * @param body The webhook body
   * @param client The GitlabClient to use for connecting
   * @returns {Promise<{targetRepoUrl: *, targetBranch: *, sourceRepoUrl: *, sourceBranch: *, sourceCommitId}>} A promise
   * containing details needed to actually clone the repos and validate the YAML files.
   */
  async validate(headers, body) {
    if (body.object_attributes.state !== 'opened')
      throw new Error(`Status not opened - ` + body.object_attributes.state);
    if (body.object_attributes.target_branch !== "master")
      throw new Error(`Can't auto-merge as MR not targeting master branch`);

    const projectId = body.object_attributes.target_project_id;
    const mergeRequestId = body.object_attributes.id;
    const changes = await this.gitlabClient.getChanges(projectId, mergeRequestId);
    if (changes.changes.filter((c) => c.old_path !== "docker-stack.yml").length > 0)
      throw new Error(`Changes to other file(s) detected. Only changes to \`docker-stack.yml\` supported for auto-merge`);

    return {
      targetRepoUrl: body.object_attributes.target.ssh_url,
      targetBranch: body.object_attributes.target_branch,
      sourceRepoUrl: body.object_attributes.source.ssh_url,
      sourceBranch: body.object_attributes.source_branch,
      sourceCommitId: body.object_attributes.last_commit.id,
    }
  }

  /**
   * Post a comment back on the merge request
   * @param message The message to post
   * @param body The webhook notification body
   * @param client The GitlabClient to use
   * @returns {Promise<*>} Promise resolved upon completion
   */
  async postComment(message, body) {
    const projectId = body.object_attributes.target_project_id;
    const mergeRequestId = body.object_attributes.id;
    return this.gitlabClient.postComment(projectId, mergeRequestId, message);
  }

  /**
   * Auto-accept the merge request
   * @param body The original webhook notification body
   * @param client The GitlabClient to use
   * @returns {Promise<*>} Promise resolved upon completion
   */
  async mergeRequest(body) {
    const projectId = body.object_attributes.target_project_id;
    const mergeRequestId = body.object_attributes.id;
    const lastCommitSha = body.object_attributes.last_commit.id;
    return this.gitlabClient.acceptMergeRequest(projectId, mergeRequestId, lastCommitSha);
  }

}
