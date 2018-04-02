import * as jsondiffpatch from "jsondiffpatch";

const isPlainObj = (o) => Boolean(
    o && o.constructor && o.constructor.prototype && o.constructor.prototype.hasOwnProperty("isPrototypeOf")
);

const flattenObj = (obj, keys=[]) => {
  return Object.keys(obj).reduce((acc, key) => {
    return Object.assign(acc, isPlainObj(obj[key])
        ? flattenObj(obj[key], keys.concat(key))
        : {[keys.concat(key).join(".")]: obj[key]}
    )
  }, {})
};

const VALID_YAML_FILE_CHANGES_REGEX = [
    /services.[a-z0-9-]+.image/,
    /services.[a-z0-9-]+.deploy.labels.(?!traefik)[a-z0-9-\\.]+/,
];

export async function validateDifferences(sourceJson, targetJson) {
  return new Promise((accept, reject) => {
    const diff = jsondiffpatch.diff(sourceJson, targetJson);
    if (diff === undefined) // Indicates no change was made
      return reject("No change detected on the stack file");

    const flattendDiff = flattenObj(diff);
    const invalidKeys = Object.keys(flattendDiff)
        .filter((changedKey) => {
          for (let i = 0; i < VALID_YAML_FILE_CHANGES_REGEX.length; i++) {
            if (changedKey.match(VALID_YAML_FILE_CHANGES_REGEX[i]))
                return false;
          }
          return true;
        });

    console.log("------------- DIFF ---------------");
    console.log(JSON.stringify(diff, null, 2));

    if (invalidKeys.length > 0) {
      reject(`Invalid keys detected: \`${invalidKeys.join("`, `")}\``);
      return;
    }

    console.log("Diff validated to contain satisfactory changes");
    accept();
  });

}