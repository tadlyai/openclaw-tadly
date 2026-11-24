import type {
  OpenClawPluginApi,
  ProviderPlugin,
  ProviderResolveDynamicModelContext,
  ProviderRuntimeModel,
} from "openclaw/plugin-sdk/plugin-entry";
import { resolveAgentModelPrimaryValue } from "openclaw/plugin-sdk/provider-onboard";
import { describe, expect, it } from "vitest";
import tadlyPlugin from "./index.js";
import * as models from "./models.js";
import { applyTadlyConfig } from "./onboard.js";

// Registers the plugin against a minimal API and returns the provider it registers.
async function registerTadlyProvider(): Promise<ProviderPlugin> {
  let provider: ProviderPlugin | undefined;
  const api = {
    registerProvider: (registered: ProviderPlugin) => {
      provider = registered;
    },
    registerModelCatalogProvider: () => {},
  } as unknown as OpenClawPluginApi;
  await tadlyPlugin.register?.(api);
  if (!provider) {
    throw new Error("Tadly plugin did not register a provider");
  }
  return provider;
}

function createDynamicModelContext(params: {
  modelId: string;
  models: ProviderRuntimeModel[];
}): ProviderResolveDynamicModelContext {
  return {
    provider: models.TADLY_PROVIDER_ID,
    modelId: params.modelId,
    modelRegistry: {
      find(providerId: string, modelId: string) {
        return (
          params.models.find(
            (model) =>
              model.provider === providerId && model.id.toLowerCase() === modelId.toLowerCase(),
          ) ?? null
        );
      },
    },
  } as unknown as ProviderResolveDynamicModelContext;
}

function createRuntimeModel(overrides: Partial<ProviderRuntimeModel> = {}): ProviderRuntimeModel {
  return {
    id: models.TADLY_DEFAULT_MODEL_ID,
    name: "Qwen-3.5",
    provider: "tadly",
    api: "openai-responses",
    baseUrl: "https://models.example.test/v1",
    headers: { "X-Route": "custom-template" },
    reasoning: false,
    input: ["text", "image"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: models.TADLY_DEFAULT_CONTEXT_WINDOW,
    maxTokens: models.TADLY_DEFAULT_MAX_TOKENS,
    compat: {},
    ...overrides,
  } as ProviderRuntimeModel;
}

async function resolveModel(modelId: string, catalog: ProviderRuntimeModel[]) {
  const provider = await registerTadlyProvider();
  return provider.resolveDynamicModel?.(createDynamicModelContext({ modelId, models: catalog }));
}

describe("tadly provider plugin", () => {
  it("declares the curated qwen3.5 model from the manifest", () => {
    const [model] = models.buildTadlyCatalogModels();
    expect(models.TADLY_BASE_URL).toBe("https://api.tadly.dev/v1");
    expect(model).toMatchObject({
      id: "qwen3.5",
      name: "Qwen-3.5",
      input: ["text", "image"],
      contextWindow: 131072,
    });
  });

  it("applies the curated default during onboarding", () => {
    const defaults = applyTadlyConfig({}).agents?.defaults;
    expect(resolveAgentModelPrimaryValue(defaults?.model)).toBe(models.TADLY_DEFAULT_MODEL_REF);
    expect(defaults?.models?.[models.TADLY_DEFAULT_MODEL_REF]?.alias).toBe("Qwen-3.5");
  });

  it.each(["custom", "missing"] as const)(
    "resolves arbitrary Tadly model ids with a %s template",
    async (source) => {
      const template = createRuntimeModel();
      const missing = source === "missing";
      const resolved = await resolveModel("example-model", missing ? [] : [template]);
      expect(resolved).toMatchObject({
        id: "example-model",
        provider: "tadly",
        api: missing ? "openai-completions" : template.api,
        baseUrl: missing ? models.TADLY_BASE_URL : template.baseUrl,
        reasoning: false,
        input: ["text"],
        contextWindow: models.TADLY_DYNAMIC_CONTEXT_WINDOW,
        maxTokens: models.TADLY_DYNAMIC_MAX_TOKENS,
        compat: models.TADLY_DYNAMIC_COMPAT,
        cost: missing ? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } : template.cost,
      });
      expect(resolved?.headers).toEqual(missing ? undefined : template.headers);
    },
  );

  it("applies provider compat to configured models without overriding explicit values", async () => {
    const provider = await registerTadlyProvider();
    const normalized = provider.normalizeResolvedModel?.({
      provider: "tadly",
      modelId: "example-model",
      model: createRuntimeModel({
        id: "example-model",
        name: "Example",
        compat: { supportsStore: true },
      }),
    } as Parameters<NonNullable<ProviderPlugin["normalizeResolvedModel"]>>[0]);
    expect(normalized?.compat).toMatchObject({
      ...models.TADLY_DYNAMIC_COMPAT,
      supportsStore: true,
    });
  });

  it("defers the curated model to static catalog resolution", async () => {
    expect(
      await resolveModel(models.TADLY_DEFAULT_MODEL_ID, [createRuntimeModel()]),
    ).toBeUndefined();
  });

  it("preserves reasoning during replay", async () => {
    const provider = await registerTadlyProvider();
    const policy = provider.buildReplayPolicy?.({
      provider: "tadly",
      modelApi: "openai-completions",
      modelId: models.TADLY_DEFAULT_MODEL_ID,
    } as Parameters<NonNullable<ProviderPlugin["buildReplayPolicy"]>>[0]);
    expect(policy).toBeDefined();
    expect(policy).not.toHaveProperty("dropReasoningFromHistory");
  });
});
