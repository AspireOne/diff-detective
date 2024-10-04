import type { Config, Provider } from "./config.js";
import Configstore from "configstore";

export class TypedConfigStore extends Configstore {
  get = (key: keyof Config): string | Provider | undefined => super.get(key);
  set = (key: keyof Config, value?: string) => super.set(key, value);
  delete = (key: keyof Config) => super.delete(key);
  has = (key: keyof Config) => super.has(key);
}
