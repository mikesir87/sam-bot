const fetch = require("node-fetch");

/**
 * A simple client for a few of the GitLab API resources.
 */
export class GitlabClient {
  constructor(url, secretToken) {
    this.baseUrl = url;
    this.secretToken = secretToken;
  }

  async postComment(projectId, mergeRequestId, comment) {
    return fetch(`${this.baseUrl}/projects/${projectId}/merge_requests/${mergeRequestId}/notes`, {
          method : "POST",
          body : JSON.stringify({ body : `[BOT] - ${comment}` }),
          headers : {
            "Private-Token" : this.secretToken,
            "Content-Type" : "application/json"
          },
        })
        .then(GitlabClient.checkStatus)
        .then((response) => response.json());
  }

  async getChanges(projectId, mergeRequestId) {
    return fetch(`${this.baseUrl}/projects/${projectId}/merge_requests/${mergeRequestId}/changes`, {
          headers : { "Private-Token" : this.secretToken },
        })
        .then(GitlabClient.checkStatus)
        .then(response => response.json());
  }

  async acceptMergeRequest(projectId, mergeRequestId, lastCommitSha) {
    return fetch(`${this.baseUrl}/projects/${projectId}/merge_requests/${mergeRequestId}/merge`, {
          method : "PUT",
          body : JSON.stringify({ sha : lastCommitSha }),
          headers : {
            "Private-Token" : this.secretToken,
            "Content-Type" : "application/json"
          },
        })
        .then(GitlabClient.checkStatus)
        .then(response => response.json());
  }

  static async checkStatus(response) {
    if (response.status >= 200 && response.status < 300)
      return response;

    const json = await response.json();
    const error = new Error(response.statusText);
    error.response = response;
    error.json = json;
    throw error;
  }
}