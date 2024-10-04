# Diff Detective

Diff Detective is an AI-powered git commit review tool that helps catch
issues before they're pushed to the repository.

## Goal

To provide an automated review of staged changes in a git repository.
it aims to:

1. Identify potential bugs or issues in the code (be it serious ones, like blatant race conditions, to less serious ones like forgotten debug statements)
2. Catch common mistakes or oversights
3. Provide context-aware insights that a traditional linter might miss

## Features

- AI-powered analysis of staged git changes
- Identification of bugs, potential issues, and code smells
- Easy-to-use command-line interface
- Configurable prompt, model, provider, max tokens, api key...

## Usage

To install:

```bash
pnpm install -g diff-detective
```

The default model is Sonnet 3.5 from Anthropic.

For each provider you use, you need an API key. You can set it

- as an environment variable in the system (OPENAI_API_KEY, ANTHROPIC_API_KEY etc.),
- always pass it as a CLI argument (detective review --api-key `your-api-key`)
- save it to the config file (detective set-api-key `your-api-key`)

To use Diff Detective, simply run `detective` or `dd` (because we are lazy) in the root of your project.

This will analyze your currently staged changes and provide a detailed report.

Example parameter usage:

```bash
detective --model gpt-4o --prompt-path "./my-custom-review-prompt.txt"
```

```bash
dd --prompt "See any issues in the database refactor?" -m "o1-mini" --ignore pnpm-lock.yaml dist/
```

Example of setting defaults:

```bash
detective set-provider anthropic
detective set-model claude-3-5-sonnet-20240620
detective set-api-key "your-api-key"
detective set-ignored-files dist/ pnpm-lock.yaml android/ ios/
detective get-config
detective clear-config
```

To see all available options, run

```bash
detective --help
```

### Supported models

Diff Detective currently supports OpenAi, Anthropic and OpenRouter as providers. You can use any model available with these providers (given you have an API key). More to come.

## How It Works

Diff Detective integrates into your git workflow as follows:

1. You stage your changes as usual with `git add`
2. Before committing, you run Diff Detective
3. The tool analyzes your staged changes using AI
4. It provides a detailed report of findings and suggestions, outputs to the console
5. You can then review the AI's feedback and make any necessary adjustments before committing

## To-Do

- [x] Custom prompt configurable via config, not only using CLI arguments
- [ ] ? Smarter algorithm for extracting code change context. Currently, the AI only sees the changed files. It might be beneficial to include additional context like repo map, related files, or just general info about the project.
- [x] Configurable array of ignored files (pnpm-lock.yaml, dist...) - both global and repo-specific
- [ ] Streaming support
- [ ] manual inclusion of additional files using CLI params
- [ ] More providers (Google, Mistral, Deepseek, Groq)
- [ ] Better prompt (that's an uphill battle)
- [ ] ? Better output formatting of code blocks
- [ ] a --fail mode, which fails the command if it found a bug that it is confident in. Useful for automatic pre-commit testing where the commit would fail in case of a found bug.
