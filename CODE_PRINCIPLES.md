# Code Principles — Dateline

This file is the single source of truth for code quality. AGENTS.md, .coderabbit.yaml, and openspec/config.yaml all reference it. Every PR is reviewed against these rules — Hard Rules block merge; Soft Guidelines are gentle nudges that get more weight in design discussions than in nit-picking.

The project is a TypeScript-only monorepo of plugins for EmDash CMS. Plugins run on Cloudflare Workers (sandboxed = 50ms CPU + 10 subrequest budget) or as trusted native code. Examples below use TypeScript 6.x idioms with the EmDash plugin SDK (`ctx.content`, `ctx.kv`, `ctx.http`, `ctx.email`, `ctx.cron`, `ctx.waitUntil`).

---

## Hard Rules — these block merge

### 1. Single Responsibility
A function or module does one thing. WHY: mixed concerns make tests fragile and changes risky — touching pricing should never break email rendering.

```ts
// BAD — mixes pricing, persistence, and notification
async function checkout(cart: Cart, ctx: Ctx) {
  const total = cart.items.reduce((s, i) => s + i.price * i.qty, 0) * 1.08;
  await ctx.content.create("orders", { total });
  await ctx.email.send({ to: cart.email, subject: "Receipt", body: `$${total}` });
}

// GOOD — each function has one reason to change
function computeOrderTotal(cart: Cart): number { /* ... */ }
async function persistOrder(order: Order, ctx: Ctx): Promise<OrderId> { /* ... */ }
async function sendReceipt(order: Order, ctx: Ctx): Promise<void> { /* ... */ }
```

### 2. No Magic Values
Numbers and strings carrying meaning must be named constants. WHY: `600` could be seconds, retries, or a limit — readers should not have to guess.

```ts
// BAD
await ctx.kv.put(`hold:${cartId}`, payload, { expirationTtl: 600 });

// GOOD
const CART_HOLD_TTL_SECONDS = 600;
await ctx.kv.put(`hold:${cartId}`, payload, { expirationTtl: CART_HOLD_TTL_SECONDS });
```

### 3. Names Reveal Intent
Use `camelCase` for functions and variables, `PascalCase` for types, classes, and interfaces. No abbreviations, no `data` / `info` / `item` / `temp` / `result` for scopes longer than 3 lines. WHY: a name is the reader's only documentation when scanning.

```ts
// BAD
function proc(d: any[]) { const r = d.map((x) => x.t * 2); return r; }

// GOOD
interface TicketTier { priceCents: number }
function doublePriceCents(tiers: TicketTier[]): number[] {
  return tiers.map((tier) => tier.priceCents * 2);
}
```

### 4. Error Handling on Boundaries
Wrap every external call (`ctx.content.*`, `ctx.http.fetch`, `ctx.kv.*`, Stripe SDK) in `try/catch`. Never swallow. Never use bare promises in handlers — use `ctx.waitUntil` for fire-and-forget. WHY: on Workers, unhandled promises silently cancel after the response and webhooks get lost (Issue #710).

```ts
// BAD — bare promise is cancelled after response returns
export async function onWebhook(req: Request, ctx: Ctx) {
  promoteHoldToAttendee(req, ctx); // FIRE-AND-FORGET — KILLED
  return new Response("ok");
}

// GOOD — try/catch on the boundary, ctx.waitUntil for deferred work
export async function onWebhook(req: Request, ctx: Ctx) {
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), req.headers.get("stripe-signature")!, SECRET);
  } catch (err) {
    ctx.log.warn("invalid stripe signature", { err });
    return new Response("bad signature", { status: 400 });
  }
  ctx.waitUntil(promoteHoldToAttendee(event, ctx));
  return new Response("ok");
}
```

### 5. Function Size Limit
Max 40 lines in the body, max 3 parameters. Beyond 3 params, take an options object. WHY: long functions hide control flow; long parameter lists hide coupling.

```ts
// BAD
function createEvent(title: string, start: Date, end: Date, tz: string, capacity: number, tierId: string) { /* 80 lines */ }

// GOOD
interface CreateEventInput { title: string; start: Date; end: Date; tz: string; capacity: number; tierId: string }
function createEvent(input: CreateEventInput): EventDraft { /* small, focused */ }
```

### 6. Nesting Limit
Max 3 levels of nesting. Use early returns, extraction, and guard clauses. WHY: deeply nested code is the most reliable predictor of bugs.

```ts
// BAD
function priceFor(tier: Tier | null) {
  if (tier) {
    if (tier.active) {
      if (tier.priceCents > 0) {
        return tier.priceCents;
      }
    }
  }
  return 0;
}

// GOOD
function priceFor(tier: Tier | null): number {
  if (!tier) return 0;
  if (!tier.active) return 0;
  return Math.max(tier.priceCents, 0);
}
```

### 7. No Duplicated Logic
More than ~5 similar lines in two or more places means extract a helper. WHY: duplicate logic drifts apart over time and produces inconsistent behavior.

```ts
// GOOD — one function, one truth
function holdKey(cartId: string): string { return `hold:${cartId}`; }
function inventoryKey(tierId: string): string { return `inventory:${tierId}`; }
```

### 8. YAGNI
Do not build for hypothetical future requirements. Delete unused code. WHY: unused code still has to be read, tested, and maintained — and it's almost always wrong when the future arrives.

```ts
// BAD — adds a strategy interface for a single concrete implementation
interface PricingStrategy { compute(cart: Cart): number }
class FlatTaxPricingStrategy implements PricingStrategy { /* only one ever */ }

// GOOD — direct function until a second case actually appears
function computeFlatTaxTotal(cart: Cart): number { /* ... */ }
```

### 9. Law of Demeter
Do not chain through more than one object. Ask only direct collaborators. WHY: deep chains couple your code to internal structure of unrelated modules.

```ts
// BAD
const city = order.customer.address.city;

// GOOD
const city = order.shippingCity(); // method on the direct collaborator
```

### 10. AAA Tests
Arrange / Act / Assert. One behavior per test. Descriptive names. No shared mutable state. WHY: a failing test should localize the defect — not require reading three other tests.

```ts
import { describe, it, expect } from "vitest";

describe("computeOrderTotal", () => {
  it("sums line items at integer cents without floating drift", () => {
    // Arrange
    const cart = { items: [{ priceCents: 1999, qty: 3 }] };
    // Act
    const total = computeOrderTotal(cart);
    // Assert
    expect(total).toBe(5997);
  });
});
```

### 11. No Speculative Abstractions
Do not introduce interfaces, base classes, wrappers, or utilities for one-time use. Apply the rule of three: abstract only on the third occurrence. WHY: most abstractions chosen before three concrete cases are wrong, and removing them is harder than adding them.

---

## Soft Guidelines — preferred, not required

### 1. KISS
The simplest solution that satisfies the requirements wins. Cleverness is a debt.

### 2. Deep Modules
Ousterhout: a simple interface hiding a complex implementation. Prefer one well-designed module over five tiny ones whose seams the caller has to remember.

### 3. Composition over Inheritance
Combine objects and functions. Avoid `extends` chains; they couple subclasses to superclass internals.

### 4. Strategic Programming
Invest a little extra time now in clarity, naming, and structure to save much more later in debugging — within reason; don't gold-plate.

### 5. Comments Explain Why, Not What
Code documents WHAT it does. Comments document WHY this specific approach — non-obvious tradeoffs, gotchas (e.g. *"DST handling requires `tzid` — see rrule.js #501"*), or links to issues.

### 6. Prefer Pure Functions
If a function does not need side effects, don't give it any. Pure functions are trivial to test and to move.

### 7. Type at Boundaries
Parse external input with Zod at the entry of every handler. Once inside, trust the type system.

```ts
import { z } from "zod";
const CreateEventBody = z.object({ title: z.string().min(1), startUtc: z.string().datetime() });
export async function onCreate(req: Request) {
  const body = CreateEventBody.parse(await req.json()); // throws → caught at boundary
  return persistEvent(body);
}
```

### 8. Fail Loud in Dev, Soft in Prod
Throw on assumption violations during development. In production, log enough context to recover and degrade gracefully — never crash a webhook handler over a non-fatal anomaly.

---

## Reference

- Linked from: `AGENTS.md` (`## Code Quality`), `.coderabbit.yaml` (`knowledge_base.code_guidelines.filePatterns`), `openspec/config.yaml` (`rules.code`)
- Idiom guide: TypeScript strict mode + Cloudflare Workers runtime
- Companion docs: `PRD.md`, `openspec/config.yaml`
