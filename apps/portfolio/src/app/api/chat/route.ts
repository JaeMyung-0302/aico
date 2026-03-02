import { buildSystemPrompt } from "@/lib/system-prompt";
import type { ChatMessage } from "@/types";

export const runtime = "edge";

const MAX_TURNS = 20;
const MAX_INPUT_LENGTH = 1000;
const RATE_LIMIT_PER_HOUR = 10;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const checkRateLimit = (ip: string): boolean => {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  // Probabilistic cleanup of expired entries (1% of requests)
  if (Math.random() < 0.01) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }

  if (entry.count >= RATE_LIMIT_PER_HOUR) {
    return false;
  }

  entry.count += 1;
  return true;
};

const getClientIp = (request: Request): string => {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
};

export const POST = async (request: Request): Promise<Response> => {
  try {
    const ip = getClientIp(request);

    if (!checkRateLimit(ip)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    }

    const body = (await request.json()) as {
      messages?: ChatMessage[];
      context?: string;
    };
    const messages = body.messages;
    const context = typeof body.context === "string" ? body.context.slice(0, 50) : undefined;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (messages.length > MAX_TURNS * 2) {
      return new Response(
        JSON.stringify({ error: "Conversation turn limit exceeded." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const validRoles = new Set(["user", "assistant"]);
    for (const msg of messages) {
      if (!validRoles.has(msg.role)) {
        return new Response(
          JSON.stringify({ error: "Invalid message role." }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      if (typeof msg.content !== "string" || msg.content.length > MAX_INPUT_LENGTH) {
        return new Response(
          JSON.stringify({
            error: `Invalid message content. Max ${MAX_INPUT_LENGTH} characters.`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error." }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = buildSystemPrompt(context);

    const anthropicMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages: anthropicMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable." }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;

              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const event = JSON.parse(data) as {
                  type: string;
                  delta?: { type: string; text?: string };
                };

                if (
                  event.type === "content_block_delta" &&
                  event.delta?.type === "text_delta" &&
                  event.delta.text
                ) {
                  controller.enqueue(
                    new TextEncoder().encode(event.delta.text),
                  );
                }
              } catch {
                // Skip malformed SSE events
              }
            }
          }
        } catch (error) {
          console.error("Stream processing error:", error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
