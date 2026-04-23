export class ApiError extends Error {
  status: number;
  code?: string;
  canFallbackToMock?: boolean;
  retryable?: boolean;
  fallbackProvider?: string | null;

  constructor(
    message: string,
    options: {
      status: number;
      code?: string;
      canFallbackToMock?: boolean;
      retryable?: boolean;
      fallbackProvider?: string | null;
    }
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.canFallbackToMock = options.canFallbackToMock;
    this.retryable = options.retryable;
    this.fallbackProvider = options.fallbackProvider;
  }
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.error ?? "Request failed.", {
      status: response.status,
      code: body.code,
      canFallbackToMock: body.canFallbackToMock,
      retryable: body.retryable,
      fallbackProvider: body.fallbackProvider,
    });
  }

  return response.json() as Promise<T>;
}
