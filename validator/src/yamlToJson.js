import * as YAML from "yamljs";

/**
 * Convert the provided YAML structures (strings) to JSON objects.
 * @param yamlObjects The YAML files to convert
 * @returns {any[]} Array of JSON objects, in same order as YAML.
 */
export function yamlToJson(...yamlObjects) {
  return yamlObjects.map(YAML.parse);
}
