# Agent log

One entry per agent session, newest at the bottom. Be honest: what went wrong is the useful part.

<!-- Copy this block for each session:

## YYYY-MM-DD · <short title>
- Goal:
- Delegated:
- Checkpoints:
- Went wrong:
- Changed by hand:

-->

## 2026-03-02 · Gemini CLI · the spec and the first slice

**Asked for:** sign-in plus the upcoming sessions list, against the criteria AC-11 and AC-12 in SPEC.md.

**Plan it proposed:** migration for `students`, `sessions`, `memberships`; a session service; two routes; two server-rendered pages.

**What I changed in the plan:** it wanted to put the "is this session full" rule in the route handler. I moved it into `src/services/sessions.js`, because Exercise 3 adds an MCP tool that needs the same rule.

**What it did that I did not ask for:** a "featured session" banner on the list page, and a newest-first ordering that contradicts AC-3. I removed the banner and fixed the ordering.

**What I would do differently:** name the ordering in the prompt, not only in the criterion. It reads the prompt more carefully than it reads the spec.

