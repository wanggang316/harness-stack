# Issue tracker: Linear

Tickets for this project live in the Linear team `<TEAM>`, filed under the project `<project, or "none">`. Linear has no official CLI: use the host's Linear tools (an MCP server) when they cover the operation, otherwise the GraphQL API with `curl` and `jq` as below.

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

`jq -e` fails the command when the response carries `errors`, so a failed write never looks like success. Pass bodies as variables (`jq -n --arg body "$body" …`), never by splicing text into the query. Mutations take the issue UUID (`.issue.id`), not the identifier.

## When a skill says "fetch the ticket"

`issue(id:)` accepts the identifier (`ENG-123`) or the UUID:

```bash
linear 'query($id: String!) { issue(id: $id) {
  id identifier title description url
  state { name type } team { id key } project { name }
  comments { nodes { id body user { name displayName } } } } }' '{"id": "ENG-123"}'
```

## When a skill says "comment on the ticket"

```bash
linear 'mutation($id: String!, $body: String!) { commentCreate(input: {issueId: $id, body: $body}) { success comment { id url } } }' \
  "$(jq -n --arg id "$issue_uuid" --arg body "$body" '{id: $id, body: $body}')"
```

## When a skill says "update the comment"

```bash
linear 'mutation($id: String!, $body: String!) { commentUpdate(id: $id, input: {body: $body}) { success } }' \
  "$(jq -n --arg id "$comment_id" --arg body "$body" '{id: $id, body: $body}')"
```

## When a skill says "link the PR to the ticket"

Put the identifier in the PR body (`Closes ENG-123`); with Linear's GitHub or GitLab integration installed, that links the PR and moves the issue on merge according to the team's settings. Also attach the URL:

```bash
linear 'mutation($id: String!, $url: String!) { attachmentLinkURL(issueId: $id, url: $url) { success } }' \
  "$(jq -n --arg id "$issue_uuid" --arg url "$pr_url" '{id: $id, url: $url}')"
```

## When a skill says "publish a ticket"

```bash
linear 'mutation($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier url } } }' \
  "$(jq -n --arg team "$team_id" --arg title "$title" --arg body "$body" \
      '{input: {teamId: $team, title: $title, description: $body}}')"
```

- Add `projectId` to file it under the project, and `parentId` to make it a sub-ticket.
- **Blocking edge**: `issueRelationCreate(input: {issueId: <blocker uuid>, relatedIssueId: <blocked uuid>, type: blocks})`.

## When a skill says "search tickets"

```bash
linear 'query($q: String!) { searchIssues(term: $q, first: 50) { nodes { identifier title url state { name type } team { key } } } }' \
  "$(jq -n --arg q "<terms>" '{q: $q}')"
```

Keep the results whose team is `<TEAM>`.

## When a skill says "list the sub-tickets and their blockers"

```bash
linear 'query($id: String!) { issue(id: $id) { children { nodes { id identifier title state { name }
  inverseRelations { nodes { type issue { identifier state { type } } } } } } } }' '{"id": "ENG-123"}'
```

A child is blocked while an inverse relation of type `blocks` points at an issue whose state type is not `completed` or `canceled`.

## Check access

The key works and the team exists:

```bash
linear 'query($key: String!) { teams(filter: {key: {eq: $key}}) { nodes { id name } } }' '{"key": "<TEAM>"}'
```
