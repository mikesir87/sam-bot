import {cloneRepos} from "./cloneRepos";
import {getFileData} from "./getFileData";
import {validateDifferences} from "./validateDifferences";
import {yamlToJson} from "./yamlToJson";
import {validateEnvironment} from "./validateEnvironment";
import {getFirstSpan, initTracer, trace} from "./tracer";

// Call run to put us into an async function
initTracer("verifier", process.env.TRACE_CONTEXT,
    () => {
      return run()
          .then(() => console.log("Run completed"))
          .catch((e) => exitAsError(e));
      },
    () => {
      process.exit(0)
    })
    .catch((err) => exitAsError(err.message));

async function run() {

  // Make sure all required ENV vars are set properly
  await trace("validateEnvironment", () => {
    return validateEnvironment();
  });

  await trace("cloneRepos", (span) => {
    span.addTags({
      source : { url : process.env.SOURCE_GIT_URL, branch : process.env.SOURCE_BRANCH },
      target : { url : process.env.TARGET_GIT_URL, branch : process.env.TARGET_BRANCH },
    });

    return cloneRepos(
        "source", process.env.SOURCE_GIT_URL, process.env.SOURCE_BRANCH, process.env.SSH_KEY_FILE,
        "target", process.env.TARGET_GIT_URL, process.env.TARGET_BRANCH, process.env.SSH_KEY_FILE
    );
  });

  let yamlSource, yamlTarget;
  await trace("getFileData", async () => {
    [ yamlSource, yamlTarget] =
        await getFileData("/app/source/docker-stack.yml", "/app/target/docker-stack.yml");
  });

  let sourceJson, targetJson;
  await trace("yamlToJson", () => {
    [ sourceJson, targetJson ] = yamlToJson(yamlSource, yamlTarget);
  });

  await trace("validateDifferences", () => {
    return validateDifferences(sourceJson, targetJson);
  });
}

function exitAsError(message) {
  console.error(message);
  process.exit(1);
}
