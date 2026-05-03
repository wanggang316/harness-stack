# Spec Compliance Brief

You are checking whether Task **`{TASK_ID}`** was actually delivered as specified.

## Task (the spec you check against)

{TASK_TEXT}

## What the Implementer Reports They Delivered

{IMPLEMENTER_REPORT}

> This report is a hint about where to look. It is **not** evidence. The diff below is the evidence.

## Git Range

**Base:** `{BASE_SHA}`
**Head:** `{HEAD_SHA}`

```bash
git diff --stat {BASE_SHA}..{HEAD_SHA}
git diff {BASE_SHA}..{HEAD_SHA}
```

## Notes from the Controller

{NOTES}
