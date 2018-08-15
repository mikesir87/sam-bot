import MemoryStream from "memorystream";
import {VERIFY_IMAGE_NAME} from "./config";
import {DockerClient} from "./dockerClient";

export async function verifyYaml({ repoDetails },
                           dockerClient = DockerClient,
                           sshKeyFilePath = process.env.SSH_KEY_FILE_PATH,
                           volumeSource = process.env.SSH_KEY_VOLUME_SOURCE,
                           volumeDestination = process.env.SSH_KEY_VOLUME_DESTINATION,
                           verifyImageName = VERIFY_IMAGE_NAME,
                           verifyNetworkName = process.env.VERIFY_NETWORK_NAME) {

  const { sourceRepoUrl, sourceBranch, sourceCommitId, targetRepoUrl, targetBranch } = repoDetails;

  const memStreamStdIn = new MemoryStream(),
        memStreamStdErr = new MemoryStream();
  let output = "", outputErr = "";
  memStreamStdIn.on("data", (data) => output += data.toString());
  memStreamStdErr.on("data", (data) => outputErr += data.toString());

  const environment = [
      `TARGET_GIT_URL=${targetRepoUrl}`,
      `TARGET_BRANCH=${targetBranch}`,
      `SOURCE_GIT_URL=${sourceRepoUrl}`,
      `SOURCE_BRANCH=${sourceBranch}`,
      `SOURCE_COMMIT_ID=${sourceCommitId}`,
      `SSH_KEY_FILE=${sshKeyFilePath}`,
  ];

  const createOptions = {
    Env: environment,
    HostConfig : {
      AutoRemove : true,
      Binds : [`${volumeSource}:${volumeDestination}`]
    }
  };

  if (verifyNetworkName)
    createOptions.HostConfig.NetworkMode = verifyNetworkName;

  // Actually start up the container and let it run
    return dockerClient.pull(verifyImageName)
        .then(() => dockerClient.run(verifyImageName, null, [memStreamStdIn, memStreamStdErr], createOptions))
        .then((container) => {
          memStreamStdIn.destroy();
          memStreamStdErr.destroy();

          // If container exited with non-zero status, throw an error
          if (container.output.StatusCode !== 0)
            throw new Error(outputErr);
        });
}

