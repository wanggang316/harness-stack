# Tracker: GitLab

Use the [`glab`](https://gitlab.com/gitlab-org/cli) CLI. Inside a clone, `glab` infers the project; when `issue-tracker.md` names a different project, add `-R <group/project>` to `glab issue` commands. In `glab api` paths, `:id` resolves to the current project; for another project use its URL-encoded path (`group%2Fproject`). GitLab calls comments "notes" and pull requests "merge requests".

## Read

```bash
glab issue view <n> -F json
glab api "projects/:id/issues/<n>/notes?sort=asc&per_page=100" \
  | jq '.[] | select(.system | not) | {id, author: .author.username, body}'
```

The current state is the state label on an open issue, `Done` for a closed one (`Canceled` when its closing note says so). An open issue without a state label is in `Backlog`.

## Comment

Create a note and print its id:

```bash
body=$(cat <<'BODY'
...
BODY
)
glab api -X POST "projects/:id/issues/<n>/notes" -f body="$body" | jq .id
```

Update a note by id:

```bash
glab api -X PUT "projects/:id/issues/<n>/notes/<id>" -f body="$body" | jq .id
```

## State

```bash
glab issue update <n> --label "In Review" --unlabel "In Progress"   # remove every other state label present
glab issue close <n>                                                  # Done
glab issue note <n> --message "Canceled: <reason>"                    # Canceled: explain, then close
glab issue close <n>
glab issue reopen <n>
```

## Link a change

Put `Closes #<n>` in the merge request description. GitLab closes the issue when the merge request merges into the default branch.

## Create

```bash
glab issue create --title "..." --label "Backlog" --description "$body"
```

- **Blockers**: native blocking links (Premium/Ultimate) through a quick action: `glab issue note <child> --message "/blocked_by #<blocker>"`. On the free tier, keep a `## Blocked by` section in the description.
- **Sub-issues**: link the child to the parent (`glab issue create --linked-issues <parent> --link-type relates_to`) and put `Part of #<parent>` at the top of its description.

## Setup

```bash
glab label list
glab label create --name "In Review" --color "#FBCA04" --description "Implementation delivered; waiting for code review"
```

Create only labels the user approved. Use the colors listed in [github.md](github.md#setup).
