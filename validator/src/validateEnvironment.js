import * as fs from "fs";
import isGitUrl from "is-git-url";

export function validateEnvironment() {
  return new Promise((accept, reject) => {
    const missingProperties = ["TARGET_GIT_URL", "TARGET_BRANCH", "SOURCE_GIT_URL", "SOURCE_BRANCH", "SOURCE_COMMIT_ID", "SSH_KEY_FILE"]
        .reduce(
            (missingProperties, propertyName) => (process.env[propertyName] === undefined) ? missingProperties.concat(propertyName) : missingProperties,
            []
        );
    if (missingProperties.length > 0) {
      reject(`Configuration error. Missing properties: \`${missingProperties.join("`, `")}\``);
    }

    if (!isGitUrl(process.env.TARGET_GIT_URL)) {
      reject(`Configuration error. TARGET_GIT_URL doesn't look like a valid clone url: ${process.env.TARGET_GIT_URL}`);
    }

    if (!isGitUrl(process.env.SOURCE_GIT_URL)) {
      reject(`Configuration error. SOURCE_GIT_URL doesn't look like a valid clone url: ${process.env.SOURCE_GIT_URL}`);
    }

    if (!fs.existsSync(process.env.SSH_KEY_FILE)) {
      reject(`Configuration error. SSH key not found at location ${process.env.SSH_KEY_FILE}`);
    }

    accept();
  });
}
