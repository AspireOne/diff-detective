// TODO: Check this string is correctly parsed.

export const reviewUserPrompt = (context: string) => `
Analyze the git changes in <code></code> tags and provide a report in the format delimited by <format></format> tags.

<format>
Summary:
- Brief overview of changes (1-6 sentences)

1. Bugs/Issues [Issues that are confidently identified as incorrect and likely to cause problems]:
   For each bug/issue:
   - File(s): [file name(s)]
   - Code: [relevant code snippet]
   - Explanation: [what's wrong and its consequences]
   - Possible reasons: [why the programmer might have made this mistake]
   - Confidence: [0-100%]
   - Severity: [Critical/High/Medium/Low]
   - Impact: [scope of the issue, e.g., affects a single function, multiple functions, entire component, multiple components, module-wide, application-wide]
   - Fix: [potential fix]

2. Potential Bugs/Issues [Issues that might be bugs but have some degree of uncertainty or are not that severe]:
   For each potential bug/issue:
   - File(s): [file name(s)]
   - Code: [relevant code snippet]
   - Explanation: [what might be wrong and potential consequences]
   - Possible reasons: [why the programmer might have introduced this potential issue]
   - Confidence: [0-100%]
   - Severity: [High/Medium/Low]
   - Impact: [potential scope of the issue, e.g., could affect a specific function, component, module, or the entire application]
   - Fix: [potential fix]

3. Warnings [Non-critical issues with variable degrees of uncertainty that might lead to slight problems, problems in the future, or seriously violate best practices]:
   For each warning:
   - File(s): [file name(s)]
   - Code: [short relevant code snippet]
   - Explanation: [what the warning is about]
   - Severity: [Medium/Low]
   - Rationale: [why this is considered a warning, including potential future implications]
   - Fix: [possible fix or best practice to follow]

4. Notes [Any other observations or suggestions that don't fit into the above categories]:
   - [Note 1: (Include file name(s) and code snippet(s) if applicable)]
   - [Note 2: (Include file name(s) and code snippet(s) if applicable)]
   ...

Use markdown formatting for better readability. Use code blocks for code snippets. Be concise but thorough. If a category has no issues, include it but state "No issues found in this category."
</format>

<code>
${context}
</code>
`;
