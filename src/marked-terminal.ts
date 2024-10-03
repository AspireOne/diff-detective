import { markedTerminal } from "marked-terminal";
import chalk from "chalk";

export const markedTerminalInstance = markedTerminal(
  {
    code: chalk.yellow,
    blockquote: chalk.gray.italic,
    html: chalk.gray,
    heading: chalk.cyanBright.bold.underline,
    firstHeading: chalk.cyanBright.bold.underline,
    hr: chalk.reset,
    list: (body, ordered) => {
      if (ordered) {
        let counter = 1;
        return body.replace(/^\*\s(.+)$/gm, (_, content) => `${counter++}. ${content}`);
      }
      return body.replace(/^\*\s/gm, "• ");
    },
    table: chalk.reset,
    paragraph: chalk.reset,
    strong: chalk.bold,
    em: chalk.italic,
    codespan: chalk.hex("#e86363").bgHex("#292929"),
    del: chalk.dim.gray.strikethrough,
    link: chalk.blue,
    href: chalk.blue.underline,

    emoji: true,
    showSectionPrefix: false,
    reflowText: true,
    tab: 2,

    unescape: true,
  },
  {
    theme: {
      // @ts-expect-error - marked-terminal is a moronic piece of shit.
      background: chalk.reset,
      // @ts-expect-error - marked-terminal is a moronic piece of shit.
      keyword: chalk.hex("#ce8d5b"),
      // @ts-expect-error - marked-terminal is a moronic piece of shit.
      built_in: chalk.cyan,
      // @ts-expect-error - marked-terminal is a moronic piece of shit.
      string: chalk.hex("#64aa70"),
      // @ts-expect-error - marked-terminal is a moronic piece of shit.
      number: chalk.yellow,
      // @ts-expect-error - marked-terminal is a moronic piece of shit.
      function: chalk.hex("#ce8d5b"),
      // @ts-expect-error - marked-terminal is a moronic piece of shit.
      title: chalk.hex("#4089d8"),
      // @ts-expect-error - marked-terminal is a moronic piece of shit.
      params: chalk.reset,
      // @ts-expect-error - marked-terminal is a moronic piece of shit.
      comment: chalk.gray,
    },
  },
);
