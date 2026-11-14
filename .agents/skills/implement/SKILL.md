---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

If the user passes a ticket reference, fetch it from the issue tracker and state its title before starting. If the reference is ambiguous, ask.

Do not use TDD in this project. This repo has no test runner and the user has not
learned the practice yet, so don't add tests or a test framework unless they ask.

Run typechecking (`npm run typecheck`) regularly as you go.

Once done, call the Skill tool with "code-review" to review the work.

Commit your work to the current branch.
