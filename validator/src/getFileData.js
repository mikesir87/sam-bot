import * as fs from "fs";

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
