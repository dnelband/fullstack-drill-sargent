import { afterEach, vi } from "vitest";

type FetchHandler = (
  url: URL,
  init: RequestInit | undefined,
) => Promise<Response> | Response;

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function installFetchMock(handler: FetchHandler) {
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? new URL(input)
        : input instanceof URL
          ? input
          : new URL(input.url);

    const signal = init?.signal;
    if (signal?.aborted) {
      throw new DOMException("The operation was aborted.", "AbortError");
    }

    const responsePromise = Promise.resolve(handler(url, init));
    if (!signal) {
      return responsePromise;
    }

    return new Promise<Response>((resolve, reject) => {
      const onAbort = () => {
        reject(new DOMException("The operation was aborted.", "AbortError"));
      };

      signal.addEventListener("abort", onAbort, { once: true });

      void responsePromise.then(
        (response) => {
          signal.removeEventListener("abort", onAbort);
          if (signal.aborted) {
            reject(new DOMException("The operation was aborted.", "AbortError"));
            return;
          }
          resolve(response);
        },
        (error: unknown) => {
          signal.removeEventListener("abort", onAbort);
          reject(error);
        },
      );
    });
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});
