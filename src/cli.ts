import { Command } from "commander";
import { review } from "./review";
import { clearConfig } from "./config";
import { packageJson } from "./package-json";
import { logger } from "./logger";

export function cli() {
  const program = new Command();

  program
    .name(packageJson.name)
    .description(packageJson.description)
    .version(packageJson.version);

  program.command("review").description("Review staged changes").action(review);

  program
    .command("clear-config")
    .description("Clear stored configuration")
    .action(() => {
      clearConfig();
      logger.log("Configuration cleared.");
    });

  program.parse(process.argv);
}
