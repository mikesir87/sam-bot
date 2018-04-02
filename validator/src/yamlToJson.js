import * as YAML from "yamljs";

export function yamlToJson(...yamlObjects) {
  return yamlObjects.map(YAML.parse);
}
