# @inspekt/skill

Inspekt's [Claude Code](https://docs.claude.com/en/docs/claude-code/) skill,
installable via [`npx skills`](https://skillsmp.com).

## Install

```bash
npx skills add steven-pribilinskiy/inspekt@skill -g -a claude-code -y
```

This drops `SKILL.md` into `~/.claude/skills/inspekt/`. Then run:

```bash
npx inspekt setup
```

to register the `inspekt` MCP server with Claude Code so the skill's tool
calls (`grab_latest`, `list_grabs`, etc.) resolve.

## What it does

When you reference a UI element you grabbed with the Inspekt Chrome extension
(via phrases like "this button", "fix this", "make this red"), Claude calls
`grab_latest()` automatically and uses the returned file/line/snippet to
answer your request.

See the [Inspekt repository](https://github.com/steven-pribilinskiy/inspekt)
for the full agent-grab story.
