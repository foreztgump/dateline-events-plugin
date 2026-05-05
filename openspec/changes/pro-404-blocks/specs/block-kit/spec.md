# Capability: Dateline Block Kit

## Requirement: exported builders cover Block Kit

Given a Dateline plugin needs to construct an admin UI
When it imports `blocks` and `elements` from `@dateline/blocks`
Then each supported Block Kit block and element has a typed builder helper.

## Requirement: malformed blocks are rejected

Given an unknown object is passed to `validateBlocks()`
When a stats block uses `items`, a button uses `label`, or a block is missing required fields
Then validation returns `{ valid: false, errors: [...] }` with paths pointing at the invalid data.

## Requirement: route responses stay Block Kit shaped

Given a plugin route returns an object
When it includes keys outside `{ blocks, toast }`
Then `assertResponse()` rejects it before the route returns to EmDash.
