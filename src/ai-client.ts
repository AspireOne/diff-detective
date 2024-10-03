import OpenAI from "openai";
import { configDefaults, type Provider } from "./config.ts";
import Anthropic, { Anthropic as AnthropicClient } from "@anthropic-ai/sdk";
import { logger } from "./logger.ts";

type OpenAiMessages = OpenAI.Chat.Completions.ChatCompletionMessageParam[];
type AnthropicMessages = { role: "user" | "assistant"; content: string }[];

type CompletionProps = {
  model: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  temperature?: number;
  maxTokens?: number;
};

export class AiClient {
  private readonly defaults = {
    temperature: 0.7,
    maxTokens: configDefaults.max_tokens,
  };
  private readonly openai: OpenAI | null = null;
  private readonly anthropic: AnthropicClient | null = null;
  public readonly provider: Provider;

  constructor(provider: Provider, apiKey: string) {
    this.provider = provider;

    if (provider === "openai" || provider === "openrouter") {
      this.openai = new OpenAI({
        apiKey,
        baseURL: provider === "openrouter" ? "https://openrouter.ai/api/v1" : undefined,
      });
    } else {
      this.anthropic = new Anthropic({ apiKey });
    }
  }

  // TODO: Implement streaming...
  async chatCompletion(props: CompletionProps) {
    if (this.openai) {
      const response = await this.openai.chat.completions.create({
        model: props.model,
        messages: props.messages,
        max_completion_tokens: props.maxTokens ?? this.defaults.maxTokens,
        temperature: props.temperature ?? this.defaults.temperature,
      });

      return response.choices[0].message?.content ?? "";
    }

    if (this.anthropic) {
      const messages = props.messages;
      const systemMessage = messages.find((m) => m.role === "system");
      const systemMessageContent = systemMessage?.content;

      if (systemMessage) {
        messages.splice(messages.indexOf(systemMessage), 1);
      }

      const response = await this.anthropic.messages.create({
        model: props.model,
        temperature: props.temperature ?? this.defaults.temperature,
        max_tokens: props.maxTokens ?? this.defaults.maxTokens,
        system: systemMessageContent,
        messages: props.messages as AnthropicMessages,
      });

      if (response.content[0].type !== "text") {
        throw new Error("Invalid response type, should be text");
      }

      return response.content[0].text;
    }

    throw new Error("No AI provider found, this should never happen?");
  }
}
