/* eslint-disable @typescript-eslint/no-explicit-any */
import chalk from "chalk";

const safeChalk = (
  chalkFunc: (...text: unknown[]) => string,
  ...args: unknown[]
): string => {
  try {
    return chalkFunc(...args);
  } catch (error) {
    return args.join(" ");
  }
};

export const logger = {
  log: (...args: any[]) => {
    console.log(...args);
  },
  info: (...args: any[]) => {
    console.info(safeChalk(chalk.blueBright, ...args));
  },
  warn: (...args: any[]) => {
    console.warn(safeChalk(chalk.yellow, "⚠ ", ...args));
  },
  error: (...args: any[]) => {
    console.error(safeChalk(chalk.red, "❌ ", ...args));
  },
  success: (...args: any[]) => {
    console.log(safeChalk(chalk.green, "✓ ", ...args));
  },
};
