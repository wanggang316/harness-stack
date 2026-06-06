# Spec Compliance Brief

你正在检查 feature **`{FEATURE_ID}`** 是否真的按规范交付了。

## Feature (the spec you check against)

{DESCRIPTION}

**Expected behavior:**
{EXPECTED_BEHAVIOR}

## What the implementer reports they delivered

{IMPLEMENTER_REPORT}

> 这份报告是关于该往哪看的线索。它**不是**证据。下面的 diff 才是证据。

## Git Range

**Base:** `{BASE_SHA}`
**Head:** `{HEAD_SHA}`

```bash
git diff --stat {BASE_SHA}..{HEAD_SHA}
git diff {BASE_SHA}..{HEAD_SHA}
```

## Notes from the Controller

{NOTES}
