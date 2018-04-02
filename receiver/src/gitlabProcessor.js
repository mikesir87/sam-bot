import secrets from "@cloudreach/docker-secrets";
import {GitlabClient} from "./gitlabClient";

const gitlabClient = new GitlabClient(
    process.env.GITLAB_BASE_URL,
    secrets[process.env.GITLAB_SECRET_TOKEN_KEY],
);

function supports(headers, body) {
  return headers["x-gitlab-token"] !== undefined &&
      body.object_kind === "merge_request" &&
      body.object_attributes !== undefined;
}

async function validate(headers, body, client = gitlabClient) {
  if (body.object_attributes.state !== 'opened')
    throw `Status not opened - ` + body.object_attributes.state;
  if (body.object_attributes.target_branch !== "master")
    throw `Can't auto-merge as MR not targeting master branch`;

  const projectId = body.object_attributes.target_project_id;
  const mergeRequestId = body.object_attributes.id;
  const changes = await client.getChanges(projectId, mergeRequestId);
  if (changes.changes.filter((c) => c.old_path !== "docker-stack.yml").length > 0)
    throw `Changes to other file(s) detected. Only changes to \`docker-stack.yml\` supported for auto-merge`;

  return {
    targetRepoUrl: body.object_attributes.target.ssh_url,
    targetBranch: body.object_attributes.target_branch,
    sourceRepoUrl: body.object_attributes.source.ssh_url,
    sourceBranch: body.object_attributes.source_branch,
    sourceCommitId: body.object_attributes.last_commit.id,
  }
}

async function postComment(message, body, client = gitlabClient) {
  const projectId = body.object_attributes.target_project_id;
  const mergeRequestId = body.object_attributes.id;
  return client.postComment(projectId, mergeRequestId, message);
}

async function mergeRequest(body, client = gitlabClient) {
  const projectId = body.object_attributes.target_project_id;
  const mergeRequestId = body.object_attributes.id;
  const lastCommitSha = body.object_attributes.last_commit.id;
  return client.acceptMergeRequest(projectId, mergeRequestId, lastCommitSha);
}

export const gitlabProcessor = {
  supports, validate, postComment, mergeRequest,
};
