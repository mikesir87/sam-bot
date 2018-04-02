import { exec } from "child_process";

export async function cloneRepos(sourceLocation,
                                 sourceGitUrl,
                                 sourceBranch,
                                 sourceSshKeyFile,
                                 targetLocation,
                                 targetGirlUrl,
                                 targetBranch,
                                 targetSshKeyFile) {
  return Promise.all([
    (repoCloner(sourceLocation, sourceGitUrl, sourceBranch, sourceSshKeyFile)),
    (repoCloner(targetLocation, targetGirlUrl, targetBranch, targetSshKeyFile)),
  ]).then(() => console.log("Repos cloned"));
}

async function repoCloner(location, repoUrl, branchName, repoKeyLocation) {
  return new Promise((accept, reject) => {
    exec(`GIT_SSH_COMMAND='ssh -o StrictHostKeyChecking=no -i ${repoKeyLocation}' git clone --branch ${branchName} --single-branch --depth=5 ${repoUrl} ./${location}`, (err, stdout, stderr) => {
      if (err) return reject(err);
      accept();
    });
  });
}