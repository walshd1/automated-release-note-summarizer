const core = require('@actions/core');
const fs = require('fs');
const PROMPT = `You are an AI assistant specializing in generating concise and informative release notes from commit messages. Your goal is to summarize the changes made between two software releases in a way that is easily understandable by users.

**Input:**

*   **Previous Release Version:** {previous_release_version}
*   **Current Release Version:** {current_release_version}
*   **Commit Messages:** {commit_messages} (A list of commit messages, one per line, representing changes between the previous and current releases.)
*   **Desired Tone:** {desired_tone} (e.g., "Technical", "User-Friendly", "Formal", "Informal")
*   **Target Audience:** {target_audience} (e.g., "Developers", "End Users", "System Administrators")
*   **Maximum Length (Optional):** {maximum_length} (e.g., "100 words", "3 bullet points")

**Instructions:**

1.  Analyze the provided commit messages to identify key changes, bug fixes, new features, and performance improvements.
2.  Group related commit messages into logical categories.
3.  Summarize each category in a clear and concise manner, using language appropriate for the specified {target_audience} and {desired_tone}.
4.  Focus on the *impact* of the changes, rather than the technical details of the code modifications.
5.  If a {maximum_length} is specified, adhere to it strictly. Prioritize the most important changes.
6.  Format the release notes as a bulleted list, with each bullet point representing a significant change or improvement.
7.  Use action verbs to start each bullet point (e.g., "Added", "Fixed", "Improved", "Updated").
8.  Avoid jargon and technical terms unless necessary for the {target_audience}. If jargon is necessary, briefly explain it.
9.  Ensure the release notes are accurate and reflect the actual changes made in the release.

**Output:**

Release Notes for Version {current_release_version} (compared to {previous_release_version}):

*   [Summarized change 1]
*   [Summarized change 2]
*   [Summarized change 3]
*   ...`;
async function run() {
  try {
    const key = core.getInput('gemini_api_key');
    const token = core.getInput('service_token');
    const ctx = { repoName: process.env.GITHUB_REPOSITORY || '', event: process.env.GITHUB_EVENT_NAME || '' };
    try { Object.assign(ctx, JSON.parse(fs.readFileSync('package.json', 'utf8'))); } catch {}
    let prompt = PROMPT;
    for (const [k, v] of Object.entries(ctx)) prompt = prompt.replace(new RegExp('{' + k + '}', 'g'), String(v || ''));
    let result;
    if (key) {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + key, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 2000 } })
      });
      result = (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (token) {
      const r = await fetch('https://action-factory.walshd1.workers.dev/generate/automated-release-note-summarizer', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(ctx)
      });
      result = (await r.json()).content || '';
    } else throw new Error('Need gemini_api_key or service_token');
    console.log(result);
    core.setOutput('result', result);
  } catch (e) { core.setFailed(e.message); }
}
run();
