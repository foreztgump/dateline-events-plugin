export const SANDBOX_CPU_BUDGET_MICROS = 50_000;
export const SANDBOX_SUBREQUEST_BUDGET = 10;
const MICROS_PER_MILLISECOND = 1_000;
const HTTP_STATUS_NO_CONTENT = 204;

export interface ProfileResult {
  ok: boolean;
  cpuMicros: number;
  subrequestCount: number;
  breaches: string[];
}

export interface ProfilingContext {
  content: Record<string, (...args: unknown[]) => Promise<unknown>>;
  email: { send(...args: unknown[]): Promise<void> };
  fetch(input: string | URL | Request, init?: RequestInit): Promise<Response>;
  http: { fetch(input: string | URL | Request, init?: RequestInit): Promise<Response> };
  kv: Record<string, (...args: unknown[]) => Promise<unknown>>;
}

export type ProfiledHandler = (ctx: ProfilingContext) => Promise<void> | void;

export async function runWithProfiling(handler: ProfiledHandler): Promise<ProfileResult> {
  const counter = createSubrequestCounter();
  const startedAt = performance.now();
  await handler(createProfilingContext(counter));
  const elapsedMicros = Math.round((performance.now() - startedAt) * MICROS_PER_MILLISECOND);
  const breaches = collectBreaches(elapsedMicros, counter.count);
  return { ok: breaches.length === 0, cpuMicros: elapsedMicros, subrequestCount: counter.count, breaches };
}

function createSubrequestCounter(): { count: number } {
  return { count: 0 };
}

function createProfilingContext(counter: { count: number }): ProfilingContext {
  const countSubrequest = (): Promise<unknown> => {
    counter.count += 1;
    return Promise.resolve(undefined);
  };
  const fetch = (): Promise<Response> => {
    counter.count += 1;
    return Promise.resolve(new Response(null, { status: HTTP_STATUS_NO_CONTENT }));
  };
  return {
    content: createSubrequestFacade(countSubrequest),
    email: { send: async () => { await countSubrequest(); } },
    fetch,
    http: { fetch },
    kv: createSubrequestFacade(countSubrequest),
  };
}

function createSubrequestFacade(handler: (...args: unknown[]) => Promise<unknown>) {
  return new Proxy({}, {
    get() {
      return handler;
    },
  }) as Record<string, (...args: unknown[]) => Promise<unknown>>;
}

function collectBreaches(cpuMicros: number, subrequestCount: number): string[] {
  const breaches: string[] = [];
  if (cpuMicros > SANDBOX_CPU_BUDGET_MICROS) {
    breaches.push(`cpuMicros exceeded ${SANDBOX_CPU_BUDGET_MICROS}`);
  }
  if (subrequestCount > SANDBOX_SUBREQUEST_BUDGET) {
    breaches.push(`subrequestCount exceeded ${SANDBOX_SUBREQUEST_BUDGET}`);
  }
  return breaches;
}
