# Diff Detective

Diff Detective is an AI-powered git commit review tool that helps developers improve their code quality and catch
potential issues before they're pushed to the repository.

## Goal

The primary goal of Diff Detective is to provide an automated, intelligent review of staged changes in a git repository.
By leveraging AI, it aims to:

1. Identify potential bugs or issues in the code
2. Suggest improvements for code quality and readability
3. Catch common mistakes or oversights
4. Provide context-aware insights that a traditional linter might miss

## Features

- AI-powered analysis of staged git changes
- Identification of bugs, potential issues, and code smells
- Suggestions for code improvements and best practices
- Easy-to-use command-line interface
- Secure storage of API keys
- Configurable options for review depth and focus

## How It Works

Diff Detective integrates into your git workflow as follows:

1. You stage your changes as usual with `git add`
2. Before committing, you run Diff Detective
3. The tool analyzes your staged changes using AI (and includes other files)
4. It provides a detailed report of findings and suggestions, outputs to the console
5. You can then review the AI's feedback and make any necessary adjustments before committing

## Usage

To use Diff Detective, simply run:

```bash
diff-detective review
```

This will analyze your currently staged changes and provide a detailed report.

## UI/UX

Diff Detective is designed with a clean, intuitive command-line interface:

- Colorized output for easy reading
- Progress indicators for longer operations
- Clear categorization of findings (bugs, warnings, suggestions)
- Interactive prompts for configuration when needed

## Installation

pnpm install -g diff-detective
