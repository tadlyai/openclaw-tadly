import { buildManifestModelProviderConfig } from "openclaw/plugin-sdk/provider-catalog-shared";
import type {
  ModelCompatConfig,
  ModelDefinitionConfig,
  ModelProviderConfig,
} from "openclaw/plugin-sdk/provider-model-shared";
import manifest from "./openclaw.plugin.json" with { type: "json" };

export const TADLY_PROVIDER_ID = "tadly";

export function buildTadlyProvider(): ModelProviderConfig {
  return buildManifestModelProviderConfig({
    providerId: TADLY_PROVIDER_ID,
    catalog: manifest.modelCatalog.providers.tadly,
  });
}

const TADLY_MANIFEST_PROVIDER = buildTadlyProvider();

export const TADLY_BASE_URL = TADLY_MANIFEST_PROVIDER.baseUrl;
export const TADLY_DEFAULT_MODEL_ID = "qwen3.5";
export const TADLY_DEFAULT_MODEL_ALIAS = "Qwen-3.5";
export const TADLY_DEFAULT_MODEL_REF = `${TADLY_PROVIDER_ID}/${TADLY_DEFAULT_MODEL_ID}` as const;

// Client-side defaults for model ids that are not in the curated catalog.
// They are deliberately conservative and are not limits published by Tadly.
export const TADLY_DYNAMIC_CONTEXT_WINDOW = 32768;
export const TADLY_DYNAMIC_MAX_TOKENS = 8192;

const TADLY_DEFAULT_MODEL = TADLY_MANIFEST_PROVIDER.models.find(
  (model) => model.id === TADLY_DEFAULT_MODEL_ID,
);
if (!TADLY_DEFAULT_MODEL) {
  throw new Error(`Missing Tadly modelCatalog row ${TADLY_DEFAULT_MODEL_ID}`);
}

export const TADLY_DEFAULT_CONTEXT_WINDOW = TADLY_DEFAULT_MODEL.contextWindow;
export const TADLY_DEFAULT_MAX_TOKENS = TADLY_DEFAULT_MODEL.maxTokens;
export const TADLY_DYNAMIC_COMPAT: ModelCompatConfig = { ...TADLY_DEFAULT_MODEL.compat };

export function isTadlyCatalogModelId(modelId: string): boolean {
  return TADLY_MANIFEST_PROVIDER.models.some((model) => model.id === modelId);
}

export function buildTadlyCatalogModels(): ModelDefinitionConfig[] {
  return TADLY_MANIFEST_PROVIDER.models;
}
