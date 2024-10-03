import type { Provider } from "./config.ts";
import Configstore from "configstore";
import { packageJson } from "./package-json.ts";

export type Config = {
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  provider: Provider;
  model?: string;
};

export class TypedConfigStore extends Configstore {
  get = (key: keyof Config) => super.get(key);
  set = (key: keyof Config, value?: string) => super.set(key, value);
  delete = (key: keyof Config) => super.delete(key);
  has = (key: keyof Config) => super.has(key);
}

export const configStore = new TypedConfigStore(packageJson.name, {
  provider: "anthropic",
  model: "claude-3-5-sonnet-20240620",
});
