import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { OllamaProvider } from '@/providers/ollama';

describe('OllamaProvider', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ models: [{ name: 'llama3.2' }] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    );
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn(async () => ({})),
          set: vi.fn(async () => undefined),
          remove: vi.fn(async () => undefined),
          clear: vi.fn(async () => undefined),
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('healthCheck does not send page content', async () => {
    const provider = new OllamaProvider();
    const status = await provider.healthCheck();
    expect(status.healthy).toBe(true);
    expect(status.model).toBe('llama3.2');
    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(call?.[0])).toContain('/api/tags');
    expect(call?.[1]?.body).toBeUndefined();
  });

  it('reads and safely caps the selected model context window', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ models: [{ name: 'gemma4:e4b' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            model_info: {
              'general.architecture': 'gemma4',
              'gemma4.context_length': 131_072,
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    const status = await new OllamaProvider({
      model: 'gemma4:e4b',
    }).healthCheck();

    expect(status.healthy).toBe(true);
    expect(status.contextWindow).toBe(32_768);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/api/show');
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      model: 'gemma4:e4b',
    });
  });

  it('rejects non-loopback endpoints', () => {
    expect(() => new OllamaProvider({ baseUrl: 'http://192.168.1.5:11434' })).toThrow();
  });

  it('rejects alternate loopback hosts and ports in version 0.1.0', () => {
    expect(() => new OllamaProvider({ baseUrl: 'http://localhost:11434' })).toThrow();
    expect(() => new OllamaProvider({ baseUrl: 'http://127.0.0.1:8080' })).toThrow();
  });

  it('reports a configured model that is not installed', async () => {
    const provider = new OllamaProvider({ model: 'missing:latest' });
    const status = await provider.healthCheck();

    expect(status.healthy).toBe(false);
    expect(status.errorCode).toBe('MODEL_UNAVAILABLE');
    expect(status.message).toContain('missing:latest');
    expect(status.details?.models).toEqual(['llama3.2']);
  });

  it('maps an HTTP 403 health response to a CORS error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: 'forbidden origin' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    );

    const status = await new OllamaProvider().healthCheck();

    expect(status.healthy).toBe(false);
    expect(status.errorCode).toBe('OLLAMA_CORS');
    expect(status.message).toContain('forbidden origin');
  });

  it('distinguishes a stopped server from a reachable CORS failure', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    const status = await new OllamaProvider().healthCheck();

    expect(status.errorCode).toBe('OLLAMA_UNREACHABLE');
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ mode: 'no-cors' });
  });

  it('reports CORS when Ollama is reachable without response access', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(new Response(null, { status: 204 })),
    );

    const status = await new OllamaProvider().healthCheck();

    expect(status.errorCode).toBe('OLLAMA_CORS');
  });

  it('maps a missing model chat response to MODEL_UNAVAILABLE', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: 'model not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    );
    const provider = new OllamaProvider({ model: 'missing:latest' });
    const events = [];

    for await (const event of provider.generate({
      taskId: 'task-test',
      systemPrompt: 'Test',
      userPrompt: 'Test',
    })) {
      events.push(event);
    }

    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'error',
        code: 'MODEL_UNAVAILABLE',
      }),
    );
  });

  it('disables thinking and keeps the model warm for chat requests', async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async (_input, _init) =>
        new Response(
          [
            JSON.stringify({ message: { content: 'OK' }, done: false }),
            JSON.stringify({ message: { content: '' }, done: true }),
            '',
          ].join('\n'),
          {
            status: 200,
            headers: { 'Content-Type': 'application/x-ndjson' },
          },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const provider = new OllamaProvider({ model: 'gemma4:e4b' });
    const events = [];

    for await (const event of provider.generate({
      taskId: 'task-gemma',
      systemPrompt: 'Test',
      userPrompt: 'Reply with OK.',
    })) {
      events.push(event);
    }

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<
      string,
      unknown
    >;
    expect(requestBody).toMatchObject({
      model: 'gemma4:e4b',
      stream: true,
      think: false,
      keep_alive: '10m',
    });
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'done',
        fullText: 'OK',
      }),
    );
  });

  it('limits predicted tokens for a shorter recovery request', async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(
          [
            JSON.stringify({ message: { content: 'Short answer.' }, done: false }),
            JSON.stringify({ message: { content: '' }, done: true }),
            '',
          ].join('\n'),
          {
            status: 200,
            headers: { 'Content-Type': 'application/x-ndjson' },
          },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const provider = new OllamaProvider({ model: 'gemma4:e4b' });

    for await (const _event of provider.generate({
      taskId: 'task-short',
      systemPrompt: 'Keep it short.',
      userPrompt: 'Summarize.',
      maxTokens: 240,
    })) {
      // Consume the stream so the complete request path is exercised.
    }

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      options?: { num_predict?: number };
    };
    expect(requestBody.options?.num_predict).toBe(240);
  });
});
