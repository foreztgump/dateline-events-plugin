# RSVP Capability Spec

## A2.rsvp.manifest

Given the RSVP package is imported
When the default plugin factory is called
Then the manifest id is `dateline-rsvp`
And capabilities are exactly `content:read`, `content:write`, `email:send`
And routes include `rsvp-submit`, `waitlist`, `admin/attendees`, and `admin/waitlist`
And hooks include `content:afterSave`, `plugin:activate`, and `cron`.

## A2.rsvp.capacity

Given an event has capacity 1
When 10 RSVP submissions run concurrently
Then exactly 1 submission succeeds
And exactly 9 submissions fail with `capacity full`.

## A2.rsvp.waitlist

Given a waitlisted attendee exists for an event
When a confirmed attendee is cancelled
Then the next waitlisted attendee is updated to confirmed
And confirmation email work is registered through `ctx.waitUntil`.

## A2.rsvp.email.waitUntil

Given a confirmed attendee is saved
When the `content:afterSave` hook runs
Then the hook calls `ctx.waitUntil(ctx.email.send(...))`.

## A2.rsvp.cron

Given the plugin activates with `ctx.cron.schedule`
When activation runs
Then a five-minute waitlist sweep schedule is registered.
If `ctx.cron.schedule` is unavailable, activation fails with evidence so the runtime gap can be escalated.
