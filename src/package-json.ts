import * as fs from "node:fs";

type PackageJson = {
  name: string;
  version: string;
  description: string;
  main: string;
};

export const packageJson = JSON.parse(
  fs.readFileSync("./package.json", "utf8"),
) as PackageJson;
