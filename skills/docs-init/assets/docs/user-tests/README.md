# docs/user-tests/

Durable, version-controlled testing **Library** — reusable across all plans. This
directory does **not** hold per-feature test documents; those concepts now live in a
plan's validation contract under the gitignored `.harness-runtime/plans/<slug>/`.

What lives here:

- `_shared/personas.yaml` — the personas registry. Every assertion in a validation
  contract names a persona by id; the persona supplies credentials, permissions, and
  fixture pointers. Add a persona here when a contract needs one.
- `_shared/fixtures/` — reusable test fixtures (DB seeds, sample payloads) shared
  across plans.

Project-wide testing conventions (tooling, cost tiers, isolation protocol, anti-patterns)
live in `docs/user-test-patterns.md`, bootstrapped by `harness-stack:test-spec` on first
run.

The per-plan validation contract (the testable assertions for a specific build) is
authored by `harness-stack:test-spec` into `.harness-runtime/plans/<slug>/validation-contract.md`
and probed at runtime by `harness-stack:user-test`.
