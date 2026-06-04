# Investigation Prompt Template

Hand this to a fresh subagent during Step 3 (Investigate), one per area. Fill the
`<…>` placeholders. The subagent enumerates user interactions for a single area;
it does **not** write cases. Its output is the raw material the author turns into
cases in Step 4.

Read-only access is sufficient — the subagent reads the spec and source, and
returns a list. Dispatch one subagent per area in parallel.

---

```
Goal: enumerate every user interaction for the "<area name>" area of the
"<feature name>" feature, so the author can write user-test cases. You are NOT
writing cases — you return an interaction inventory.

Context to read:
- Product spec: docs/product-specs/<feature>.md  (this area covers: <AC ids>)
- Project test conventions: docs/user-test-patterns.md  (dimensions + personas)
- Personas registry: docs/user-tests/_shared/personas.yaml
- Relevant source / entry points: <paths, URL routes, API endpoints, CLI cmds>

Task:
1. For the "<area name>" area, list every user-facing interaction. Group them:
   - OBVIOUS — most users will hit this; the primary success flows.
   - SUBTLE — easy to forget; secondary states, optional inputs, ordering,
     reload/back/refresh behaviour, concurrent actions, permission variants.
   - ERROR / EDGE — invalid input, empty/null/boundary/max-size values, network
     failure, unauthorized access, expired state, duplicate submission.
2. For each interaction, write a one-sentence behavioural description from the
   persona's point of view: what they DO, what they SEE, what they EXPECT. Name
   the persona where it matters (use registry IDs).
3. Flag any interaction that pulls in ANOTHER feature — note it as
   "cross-feature: <which feature>" so the author can route it to milestone
   integration verification instead of this document.
4. Consider the mandatory case dimensions from docs/user-test-patterns.md
   (accessibility for UI, security for auth/data) and surface interactions for
   them explicitly.

Rules:
- Observable-only. Describe what a user perceives or an external probe reads.
  Do NOT reference function names, file paths, CSS classes, or internal test ids.
- Do NOT write case markdown, IDs, preconditions, or assertions. Just the
  grouped bullet list.
- Be diligent on SUBTLE and ERROR/EDGE — that is where this pass earns its keep.
  A list that is all OBVIOUS has failed.

Output format:
- Three sections: "Obvious", "Subtle", "Error/Edge".
- One bullet per interaction, each a single behavioural sentence.
- Target 6–15 interactions for a typical area; more is fine.
- A short "Cross-feature notes" section at the end if any surfaced.
```
