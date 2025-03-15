export const reviewUserPrompt = (context: string) => `
Analyze the git changes inside <code></code> tags and provide a report in the format delimited by <format></format> tags.

Additional instructions:
- Be concise.
- Speculative low-priority issues like formatting, @ts-ignore, variable names, non-null assertions etc. should not be included at all, because they are usually intended. If you do find it severe in the given context, include it only in notes.

Additional info about formatting:
- The <format></format> section uses {} (curly braces) to indicate where content should be inserted and to include description, and [] (square brackets) to describe each category. It should not be in the final output.
- The format introduces multiple categories. Each category is OPTIONAL. If you find no issues at all that would belong to a certain category (which is very possible), just include the category and write "No issues found.". All categories should be included.
- Categories should always be written in the same order as in the format.
- In each category can be multiple items. Items should be separated by "---" (three dashes - markdown for a horizontal line, and two newlines before and after it).
- Use markdown formatting. Use code blocks for code snippets, backticks for file names, bold for bullet point titles, and other things that improve readability. It must be very well readable and pretty.

<format>
### 📝 Summary [A short summary and assesment of the changes]

{text}

### ☠️ Bugs/Issues [Issues that are confidently identified as incorrect and likely to cause problems]:

{List of file name(s) (if applicable), e.g. \`src/index.ts\`, \`src/utils.ts\`...}

{Explanation: what's wrong, and it's consequences. Include a code snippet (if applicable)}

{Fix: a potential fix to the issue}

{
- Confidence: [0-100%]
- Severity: [Critical/High/Medium/Low]
- Impact: [scope of the issue, e.g., affects a single function, multiple functions, entire component, multiple components, application-wide, database...]
}

### 🐛 Potential Bugs/Issues [Issues that might be bugs but you have some degree of uncertainty or are not that severe]:

{List of file name(s) (if applicable), e.g. \`src/index.ts\`, \`src/utils.ts\`...}

{Explanation: what's wrong, and it's consequences. Include a code snippet (if applicable)}

{Fix: a potential fix to the issue}

{
- Confidence: [0-100%]
- Severity: [High/Medium/Low]
- Impact: [scope of the issue, e.g., affects a single function, multiple functions, entire component, multiple components, application-wide, database...]
}

### ⚠️ Warnings [Non-severe issues with variable degrees of uncertainty that might lead to slight problems, problems in the future, or seriously violate best practices. Avoid reporting miniscule things]:

{List of file name(s) (if applicable), e.g. \`src/index.ts\`, \`src/utils.ts\`...}

{Explanation: what the warning is about, why it's considered a warning, potential implications}

{Fix: a potential fix to the issue}

{
- Severity: [Medium/Low]
- Impact: [scope of the issue, e.g., affects a single function, multiple functions, entire component, multiple components, application-wide, database...]
}

### 🗒️ Notes [Any other suggestions that don't fit into the above categories, but might be valuable to know]:

{A bullet list of any additional notes, that are not issues per-se, that the developer should be aware of - only important ones}
</format>

<code>
${context}
</code>
`;
