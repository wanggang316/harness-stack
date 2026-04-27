# Security Audit Brief

You are auditing code changes for security vulnerabilities. Apply the OWASP map and trust-boundary process from your system prompt.

## What Was Implemented

{DESCRIPTION}

## Spec / ExecPlan

{SPEC_PATH}

## Git Range

**Base:** `{BASE_SHA}`
**Head:** `{HEAD_SHA}`

```bash
git diff --stat {BASE_SHA}..{HEAD_SHA}
git diff {BASE_SHA}..{HEAD_SHA}
```

## Trust Surfaces in This Change

{TRUST_SURFACES}

(e.g., `POST /api/login` accepts unauthenticated user input → DB; LLM tool-call output flows into shell exec at `tools/run.ts:42`.)

## Focus Areas

{FOCUS_AREAS}

## Notes from the Author

{NOTES}

---

## Report Skeleton

Emit your audit in exactly this shape. Include a secure-code example for every Critical and Important finding.

```markdown
## Security Audit: <title / PR link>

**Range:** `<BASE_SHA>..<HEAD_SHA>` — N files, ±L lines
**Spec:** <spec path>
**Trust boundaries inspected:** <list of input surfaces / boundaries reviewed>

### Strengths
- `path/to/file.ts:L` — specific security-positive observation

### Findings

#### Critical
- **<one-line title>** — `path/to/file.ts:42`
  - Category: <OWASP ID or trust-boundary class>
  - Exploitability: <remote/local, authenticated/unauthenticated>
  - Blast radius: <what the attacker gains>
  - What: <what is wrong; show the vulnerable snippet>
  - Why: <why it matters>
  - Fix: <concrete fix, with a secure-code example>

#### Important
- ...

#### Suggestion
- ...

#### Nit
- ...

#### FYI
- ...

### Scans
- [ ] Dependency audit (`<command>`) — clean / N findings
- [ ] Secrets scan — clean / N findings
- [ ] Manual trust-boundary walkthrough complete

### Verdict
- [ ] **Approve** — Ready to merge
- [ ] **Approve with fixes** — Critical / Important resolvable in this round
- [ ] **Request changes** — Issues must be addressed

**Reasoning:** <1–2 sentences>
```

### Worked example of a Critical finding

```
#### Critical
- **SQL injection in user lookup** — `src/api/users.ts:42`
  - Category: A03 Injection
  - Exploitability: remote, unauthenticated (POST /api/login)
  - Blast radius: full DB read, password hash exfiltration
  - What: `db.query(\`SELECT * FROM users WHERE email = '${email}'\`)`
  - Why: attacker-controlled `email` is interpolated into SQL.
  - Fix:
    ```ts
    db.query('SELECT * FROM users WHERE email = ?', [email]);
    ```
```
