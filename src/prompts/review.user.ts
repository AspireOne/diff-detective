// TODO: Check this string is correctly parsed.

export const reviewUserPrompt = (context: string) => `
Analyze the git changes in <code></code> tags and provide a report in the format delimited by <format></format> tags.

Additional info about formatting:
- The <format></format> section uses {} (curly braces) to indicate where content should be inserted and to include description. Same thing with [] (square brackets). It should not be in the final output.
- The format introduces multiple categories. Each category is OPTIONAL. If you find no bugs etc. at all, that is very possible - just says so directly in the summary and that's it. Don't overcomplicate it.
- In each category can be multiple items. Items should be separated by "---" (three dashes - markdown for a horizontal line, and two newlines before and after it).
- Use markdown formatting. Use code blocks for code snippets, backticks for file names, bold for bullet point titles, and other things that improve readability. It must be very well readable and pretty.  

<format>
## 🔎 Summary [A general assesment]:
{Assesment}

### ☠️ Bugs/Issues [Issues that are confidently identified as incorrect and likely to cause problems]:
{List of file name(s) (if applicable), e.g. \`src/index.ts\`, \`src/utils.ts\`...}

{Explanation: what's wrong, and it's consequences. Include a code snippet (if applicable)}

{Fix: a potential fix to the issue}

{bullet list:
- Confidence: [0-100%]
- Severity: [Critical/High/Medium/Low]
- Impact: [scope of the issue, e.g., affects a single function, multiple functions, entire component, multiple components, application-wide, database...]
}

### 🐛 Potential Bugs/Issues [Issues that might be bugs but have some degree of uncertainty or are not that severe]:
{List of file name(s) (if applicable), e.g. \`src/index.ts\`, \`src/utils.ts\`...}

{Explanation: what's wrong, and it's consequences. Include a code snippet (if applicable)}

{Fix: a potential fix to the issue}

{bullet list:
- Confidence: [0-100%]
- Severity: [High/Medium/Low]
- Impact: [scope of the issue, e.g., affects a single function, multiple functions, entire component, multiple components, application-wide, database...]
}

### ⚠️ Warnings [Non-critical issues with variable degrees of uncertainty that might lead to slight problems, problems in the future, or seriously violate best practices. Avoid reporting miniscule things.]:
{List of file name(s) (if applicable), e.g. \`src/index.ts\`, \`src/utils.ts\`...}

{Explanation: what the warning is about, why it's considered a warning, potential implications}

{Fix: a potential fix to the issue}

{bullet list:
- Severity: [Medium/Low]
- Impact: [scope of the issue, e.g., affects a single function, multiple functions, entire component, multiple components, application-wide, database...]
}

### 🗒️ Notes [Any other observations or suggestions that don't fit into the above categories, but might be valuable to know]:
{A bullet list of any additional notes. This too is heavily optional}
</format>

<code>
${context}
</code>
`;
