import Jasmine from "jasmine";

const jasmine = new Jasmine();

jasmine.loadConfig({
  spec_dir: "test",
  spec_files: [
      "**/*.js",
  ]
});

jasmine.execute();
