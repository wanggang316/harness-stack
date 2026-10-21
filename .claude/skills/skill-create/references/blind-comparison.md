# Blind comparison of old and new versions

A fix based on one bad conversation can overfit. After changing a skill's behavior, use a blind comparison to check the target behavior and new failure modes. A tie, regression, or insufficient evidence is a valid conclusion.

- Run the same natural user request once with each version. Each agent works in its own temporary directory.
- Keep words such as eval, test, judge, candidate, and compare out of agent-visible directory names, filenames, and prompts. Do not reveal the other version or ask the agent to list the skills or files it used.
- Determine skill adherence from files actually read and artifact structure in the transcript, not self-reports.
- Read every output before concluding. When results conflict with expectations, question the evaluation criteria first.
- Record correctness and execution separately. Both versions may fix a bug while only one produces red-green evidence per slice; final test counts alone miss that distinction.
- Report scenario scope and untested cases. One success does not establish superiority across tasks. Fix and recheck specific findings rather than rerunning until a preferred winner emerges.
