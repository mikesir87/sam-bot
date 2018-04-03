import {cloneRepos} from "./cloneRepos";
import {getFileData} from "./getFileData";
import {validateDifferences} from "./validateDifferences";
import {yamlToJson} from "./yamlToJson";
import {validateEnvironment} from "./validateEnvironment";

run()
    .then(() => console.log("Run completed"))
    .catch((e) => exitAsError(e));

async function run() {
  await validateEnvironment();

  await cloneRepos(
      "source", process.env.SOURCE_GIT_URL, process.env.SOURCE_BRANCH, process.env.SSH_KEY_FILE,
      "target", process.env.TARGET_GIT_URL, process.env.TARGET_BRANCH, process.env.SSH_KEY_FILE
  );
  const [ yamlSource, yamlTarget] =
      await getFileData("/app/source/docker-stack.yml", "/app/target/docker-stack.yml");
  const [ sourceJson, targetJson ] = yamlToJson(yamlSource, yamlTarget);
  await validateDifferences(sourceJson, targetJson);
}

function exitAsError(message) {
  console.error(message);
  process.exit(1);
}