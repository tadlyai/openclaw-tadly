// Live test: a text + tool-call round trip against the real Tadly API.
// Skipped unless TADLY_API_KEY is set and TADLY_LIVE_TEST=1 (or LIVE=1).
import { completeSimple, type AssistantMessage, type Model, type Tool } from "openclaw/plugin-sdk/llm";
import { describe, expect, it } from "vitest";
import { buildTadlyProvider, TADLY_DEFAULT_MODEL_ID } from "./models.js";

const TADLY_API_KEY = process.env.TADLY_API_KEY?.trim() ?? "";
const LIVE_FLAG = ["TADLY_LIVE_TEST", "LIVE", "OPENCLAW_LIVE_TEST"].some((name) =>
  ["1", "true", "yes", "on"].includes((process.env[name] ?? "").trim().toLowerCase()),
);
const describeLive = LIVE_FLAG && TADLY_API_KEY.length > 0 ? describe : describe.skip;

const echoTool: Tool = {
  name: "live_echo",
  description: "Return the supplied value.",
  parameters: {
    type: "object",
    properties: { value: { type: "string" } },
    required: ["value"],
    additionalProperties: false,
  },
};

function resolveLiveModel(): Model<"openai-completions"> {
  const provider = buildTadlyProvider();
  const model = provider.models?.find((entry) => entry.id === TADLY_DEFAULT_MODEL_ID);
  if (!model) {
    throw new Error(`Tadly catalog does not include ${TADLY_DEFAULT_MODEL_ID}`);
  }
  return {
    provider: "tadly",
    baseUrl: provider.baseUrl,
    ...model,
    api: "openai-completions",
  } as Model<"openai-completions">;
}

function assistantText(message: AssistantMessage): string {
  return message.content
    .flatMap((block) => (block.type === "text" ? [String(block.text).trim()] : []))
    .filter(Boolean)
    .join(" ");
}

describeLive("tadly plugin live", () => {
  it("completes a tool-call round trip with the default model", async () => {
    const model = resolveLiveModel();
    const user = {
      role: "user" as const,
      content: "Call live_echo with value tadly. Do not answer directly.",
      timestamp: Date.now() - 3,
    };
    const first = await completeSimple(
      model,
      { messages: [user], tools: [echoTool] },
      { apiKey: TADLY_API_KEY, maxTokens: 256 },
    );
    if (first.stopReason === "error") {
      throw new Error(first.errorMessage || "Tadly first turn returned an error");
    }
    const toolCall = first.content.find((block) => block.type === "toolCall");
    if (toolCall?.type !== "toolCall") {
      throw new Error(`Tadly live model did not call a tool: ${first.stopReason}`);
    }
    expect(toolCall.name).toBe("live_echo");
    expect(toolCall.arguments).toEqual({ value: "tadly" });

    const second = await completeSimple(
      model,
      {
        messages: [
          user,
          first,
          {
            role: "toolResult",
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            content: [{ type: "text", text: "ok" }],
            isError: false,
            timestamp: Date.now() - 1,
          },
          { role: "user", content: "Reply with exactly: ok", timestamp: Date.now() },
        ],
        tools: [echoTool],
      },
      { apiKey: TADLY_API_KEY, maxTokens: 64 },
    );
    if (second.stopReason === "error") {
      throw new Error(second.errorMessage || "Tadly second turn returned an error");
    }
    expect(assistantText(second)).toMatch(/^ok[.!]?$/i);
  }, 120_000);
});
