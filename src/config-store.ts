import type { Config, Provider } from "./config.js";
import Configstore from "configstore";

export class TypedConfigStore extends Configstore {
  get = <K extends keyof Config>(key: K): Config[K] => super.get(key);
  set = (key: keyof Config, value?: string | string[]) => super.set(key, value);
  delete = (key: keyof Config) => super.delete(key);
  has = (key: keyof Config) => super.has(key);
}
