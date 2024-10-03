import Configstore from "configstore";
import inquirer from "inquirer";
import { packageJson } from "./package-json";

const config = new Configstore(packageJson.name);

export async function getOpenAIKey(): Promise<string> {
  let key = config.get("openai_api_key") as string | undefined;

  if (!key) {
    const response = await inquirer.prompt<{ apiKey: string }>([
      {
        type: "password",
        name: "apiKey",
        message: "Enter your OpenAI API key:",
      },
    ]);

    key = response.apiKey;
    config.set("openai_api_key", key);
  }

  return key;
}

export function clearConfig(): void {
  config.clear();
}
