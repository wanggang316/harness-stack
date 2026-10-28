# Tracker: Linear

Linear has no official CLI. Use the host's Linear tools (an MCP server) when they cover the operation; otherwise call the GraphQL API with `curl` and `jq`.

The API key comes from `$LINEAR_API_KEY`, then `~/.config/linear/api-key`, then `~/.linear-api-key`. Never print the key or write it into a ticket, file, or log.

```bash
LINEAR_API_KEY=${LINEAR_API_KEY:-$(cat ~/.config/linear/api-key 2>/dev/null || cat ~/.linear-api-key 2>/dev/null)}
linear() {  # linear '<query>' '<variables JSON>'
  jq -n --arg q "$1" --argjson v "${2:-{\}}" '{query: $q, variables: $v}' \
    | curl -sS https://api.linear.app/graphql \
        -H "Authorization: $LINEAR_API_KEY" -H 'Content-Type: application/json' --data @- \
    | jq -e 'if .errors then (.errors | tostring | halt_error(1)) else .data end'
}
```

`jq -e` fails the command when the response carries `errors`, so a failed write never looks like success. Pass bodies as variables (`jq -n --arg body "$body" '{id: "ENG-123", body: $body}'`), never by splicing text into the query.

## Read

`issue(id:)` accepts the identifier (`ENG-123`) or the UUID. Mutations below take the issue UUID (`.issue.id`).

```bash
linear 'query($id: String!) { issue(id: $id) {
  id identifier title description url
  state { name type } team { id key } project { name }
  comments { nodes { id body user { name displayName } } } } }' '{"id": "ENG-123"}'
```

The current state is `state.name`.

## Comment

```bash
linear 'mutation($id: String!, $body: String!) { commentCreate(input: {issueId: $id, body: $body}) { success comment { id url } } }' \
  "$(jq -n --arg id "$issue_uuid" --arg body "$body" '{id: $id, body: $body}')"

linear 'mutation($id: String!, $body: String!) { commentUpdate(id: $id, input: {body: $body}) { success } }' \
  "$(jq -n --arg id "$comment_id" --arg body "$body" '{id: $id, body: $body}')"
```

## State

Look up the team's state ids once, then update the issue:

```bash
linear 'query($key: String!) { teams(filter: {key: {eq: $key}}) { nodes { id states { nodes { id name type } } } } }' '{"key": "ENG"}'
linear 'mutation($id: String!, $state: String!) { issueUpdate(id: $id, input: {stateId: $state}) { success issue { state { name } } } }' \
  "$(jq -n --arg id "$issue_uuid" --arg state "$state_id" '{id: $id, state: $state}')"
```

## Link a change

Put the identifier in the PR branch name or body (`Closes ENG-123`) when the Linear GitHub integration is installed; it links the PR and moves the issue on merge according to the team's settings. Otherwise attach the URL:

```bash
linear 'mutation($id: String!, $url: String!) { attachmentLinkURL(issueId: $id, url: $url) { success } }' \
  "$(jq -n --arg id "$issue_uuid" --arg url "$pr_url" '{id: $id, url: $url}')"
```

## Create

```bash
linear 'mutation($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier url } } }' \
  "$(jq -n --arg team "$team_id" --arg title "$title" --arg body "$body" --arg state "$backlog_state_id" \
      '{input: {teamId: $team, title: $title, description: $body, stateId: $state}}')"
```

- Add `projectId` to file the issue under the configured project, and `parentId` to make it a sub-issue.
- **Blockers**: `issueRelationCreate(input: {issueId: <blocker uuid>, relatedIssueId: <blocked uuid>, type: blocks})`.

## Setup

Creating workflow states needs team admin rights. Create only states the user approved, with type `started` for `Reviewed` and `Merging`:

```bash
linear 'mutation($input: WorkflowStateCreateInput!) { workflowStateCreate(input: $input) { success workflowState { id name } } }' \
  "$(jq -n --arg team "$team_id" '{input: {teamId: $team, name: "Reviewed", type: "started", color: "#0E8A16"}}')"
```

If the key lacks the rights, report the missing states and ask the user to add them in Linear's team settings (Workflow).
