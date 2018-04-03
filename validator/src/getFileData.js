import * as fs from "fs";

/**
 * Get the file contents for all provided file paths
 * @param paths The list of files to fetch content for
 * @returns {Promise<Promise<*>[]>} Promise whose resolved value is an array of file contents
 * in the same order as requested
 */
export async function getFileData(...paths) {
  return Promise.all(
      paths.map((path) => readFile(path))
  );
}

async function readFile(path) {
  return new Promise((accept, reject) => {
    fs.readFile(path, (err, buffer) => {
      if (err) return reject(err);
      accept(buffer.toString());
    });
  });
}
