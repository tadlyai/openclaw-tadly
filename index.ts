import { readConfiguredProviderCatalogEntries } from "openclaw/plugin-sdk/provider-catalog-shared";
import { defineSingleProviderPluginEntry } from "openclaw/plugin-sdk/provider-entry";
import {
  buildProviderReplayFamilyHooks,
  resolveFamilyForwardCompatModel,
} from "openclaw/plugin-sdk/provider-model-shared";
import { buildProviderToolCompatFamilyHooks } from "openclaw/plugin-sdk/provider-tools";
import {
  isTadlyCatalogModelId,
  TADLY_BASE_URL,
  TADLY_DEFAULT_MODEL_ID,
  TADLY_DYNAMIC_COMPAT,
  TADLY_DYNAMIC_CONTEXT_WINDOW,
  TADLY_DYNAMIC_MAX_TOKENS,
  TADLY_PROVIDER_ID,
} from "./models.js";
import { applyTadlyConnectionConfig, TADLY_DEFAULT_MODEL_REF } from "./onboard.js";
import manifest from "./openclaw.plugin.json" with { type: "json" };

export default defineSingleProviderPluginEntry({
  id: TADLY_PROVIDER_ID,
  name: "Tadly Provider",
  description: "Tadly provider plugin",
  manifest,
  provider: {
    label: "Tadly",
    docsPath: "https://tadly.dev/docs",
    manifestAuth: {
      defaultModel: TADLY_DEFAULT_MODEL_REF,
      applyConfig: applyTadlyConnectionConfig,
      noteTitle: "Tadly",
      noteMessage: [
        "Tadly serves models through an OpenAI-compatible API.",
        "Get an API key at: https://tadly.dev",
        "Docs: https://tadly.dev/docs",
      ].join("\n"),
    },
    catalog: {
      discoveryMode: "strict",
      allowExplicitBaseUrl: true,
      liveModelDiscovery: {
        endpointPath: "models",
        buildRequestHeaders: ({ apiKey }) => ({
          Accept: "application/json",
          "User-Agent": "openclaw",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        }),
      },
    },
    augmentModelCatalog: ({ config }) =>
      readConfiguredProviderCatalogEntries({
        config,
        providerId: TADLY_PROVIDER_ID,
      }),
    normalizeResolvedModel: ({ model }) => ({
      ...model,
      compat: { ...TADLY_DYNAMIC_COMPAT, ...model.compat },
    }),
    ...buildProviderReplayFamilyHooks({
      family: "openai-compatible",
      dropReasoningFromHistory: false,
    }),
    ...buildProviderToolCompatFamilyHooks("openai"),
    resolveDynamicModel: (ctx) => {
      const modelId = ctx.modelId.trim();
      if (!modelId || isTadlyCatalogModelId(modelId)) {
        return undefined;
      }

      return resolveFamilyForwardCompatModel({
        providerId: TADLY_PROVIDER_ID,
        modelId,
        ctx,
        cases: [
          {
            match: () => true,
            templateIds: [TADLY_DEFAULT_MODEL_ID],
            patch: ({ template }) =>
              template ? undefined : { api: "openai-completions", baseUrl: TADLY_BASE_URL },
          },
        ],
        patch: {
          provider: TADLY_PROVIDER_ID,
          reasoning: false,
          input: ["text"],
          contextWindow: TADLY_DYNAMIC_CONTEXT_WINDOW,
          maxTokens: TADLY_DYNAMIC_MAX_TOKENS,
          compat: TADLY_DYNAMIC_COMPAT,
        },
        synthesize: true,
      });
    },
    isModernModelRef: () => true,
  },
});
