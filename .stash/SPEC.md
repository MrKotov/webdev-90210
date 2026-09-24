# Study group planner

<!-- Exercise 2. Write the non-goals first. Every acceptance criterion must be checkable in under a minute.
     Keep these headings exactly as they are: the self-checks look for them by name.
     The full target is on the course site under Resources → The course project. -->

## Project option
Study groups: students propose a session for a course, and others join it until it is full.

## Goals

- A student can propose a study session for a course they take, and see who joined.
- A student can find sessions for their courses in the next two weeks and join one in two clicks.
- An organiser can cancel their own session, and everyone who joined sees that it is cancelled.

## Non-goals

- Payments of any kind: sessions are free, and no money passes through this app.
- A mobile application: the web UI works on a phone, and that is the whole mobile story.
- E-mail or push notifications: you find out by opening the app.
- Timetable import from the faculty system: sessions are typed in by hand.

## Constraints

- Node 22 and PostgreSQL, because that is what the codespace and Render both give me for free.
- Server-rendered pages with small islands of JavaScript: no SPA framework.
- Free tiers only, so the app must survive a cold start of about a minute after idling.
- The repository is public until the defence, so no secret is ever committed.

## The model feature
<!-- Which model, which modality, and what it does for a user.
     Name three things or the check fails: the input it receives, the output it produces,
     and what happens when the model is slow, rate-limited or wrong. -->
- Model: Gemini flash through the hosted API, named in one file, `src/model/gemini.js`.
- Input: the free-text title and notes a student typed when proposing a session.
- Output: three suggested topic tags and a one-line summary, shown before they press Create.
- When it fails: an 8-second timeout, and on a timeout, a 429 or a reply of the wrong shape the form falls back to no tags and an empty summary, which the student can type themselves. The feature is never on the path that saves the session.

## Auth
<!-- Local sign-in plus at least one provider. Say how an account signing in both ways stays one account. -->
- Local: e-mail and password, hashed with argon2, session cookie that is httpOnly and SameSite=Lax.
- Provider: sign in with Google over OIDC, client id and secret from the environment.
- Linking: the account is keyed by verified e-mail address. Signing in with Google for an address that already has a local password attaches the Google identity to that same account rather than creating a second one, and a local sign-up for an address that already came from Google asks for the Google button instead.

## MCP tools
<!-- At least three tools your own MCP server exposes over this project's data.
     Each tool calls the same service functions the HTTP API calls, so the same rules apply.
     A description shorter than 20 characters is not a description. -->
| Tool | What it does | Who may call it |
| --- | --- | --- |
| find_sessions | Lists study sessions for a course in the next fourteen days, with free places and the organiser's name | any signed-in student |
| join_session | Joins the caller to a session that still has a free place, and refuses when it is full or already joined | the student the token belongs to |
| my_sessions | Lists the sessions the calling student organises or has joined, upcoming first, so an agent can plan a week | the student the token belongs to |

## UI
<!-- Stack, and the three or more screens. The graded checklist lives in docs/UI.md. -->
Server-rendered HTML with a small amount of JavaScript for the join button. Four screens: sign in, the list of upcoming sessions filtered by course, one session with its members, and the form that proposes a session. The checklist lives in `docs/UI.md`.

## Architecture
<!-- Exercise 3. One request traced through every layer, naming the file for each one,
     plus one place where your own code does not match this layering. -->

## Acceptance criteria
<!-- Every criterion carries an id. A test proves it by naming that id in its title, for example
     test('AC-3 a booking that overlaps another is refused with 409', ...).
     Say who acts, what they see, and what must be true in the database. -->

- [AC-1] A student who signs in with a wrong password sees "Wrong e-mail or password", and no row is added to `sessions_log`.
- [AC-2] A signed-out visitor asking for `/sessions` is redirected to `/sign-in` and sees no session titles anywhere in the response body.
- [AC-3] The upcoming list shows only sessions whose `starts_at` is in the future, oldest first, at most fourteen days ahead.
- [AC-4] A student who joins a session with a free place sees their own name in the member list, and one row appears in `memberships`.
- [AC-5] A student who joins a session that is already full sees "This session is full", and no row appears in `memberships`.
- [AC-6] A student who joins the same session twice sees "You have already joined", and `memberships` still holds exactly one row for that pair.
- [AC-7] Cancelling a session the caller does not organise returns 403, and the session's `cancelled_at` stays null.
- [AC-8] Cancelling a session while signed out returns 401.
- [AC-9] An organiser who cancels their own session sees it marked cancelled in the list, and everyone who joined sees the same on their next page load.
- [AC-10] Proposing a session with a start time in the past returns 422 and the form redisplays the typed values.

### Slice 1: sign-in and the upcoming sessions list

- [AC-11] A student signs in with e-mail and password and lands on the upcoming list.
- [AC-12] The upcoming list shows rows that come from the `sessions` table, not from a fixture in the code.

## Traceability
<!-- Filled in from Exercise 3 onward: each AC id, and the test that names it. -->
| Criterion | Test |
| --- | --- |
| AC-1 |  |

## Spec vs result
<!-- After the agent builds the slice: which criteria passed, which it missed or reinterpreted, and what you changed in this spec because of it. -->
AC-11 and AC-12 passed on the first run. The agent reinterpreted AC-3: it ordered the list newest first because that is what its example did, and I had written "oldest first" only in the criterion, not in the prompt. It also invented a "featured session" banner nobody asked for, which I removed. I changed AC-3 to name the column, `starts_at`, because "the date" was ambiguous between the session's start and the row's creation.
