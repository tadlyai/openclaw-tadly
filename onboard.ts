import {
  createModelCatalogPresetAppliers,
  createProviderConnectionPresetAppliers,
} from "openclaw/plugin-sdk/provider-onboard";
import {
  buildTadlyCatalogModels,
  TADLY_BASE_URL,
  TADLY_DEFAULT_MODEL_ALIAS,
  TADLY_DEFAULT_MODEL_REF,
  TADLY_PROVIDER_ID,
} from "./models.js";

export { TADLY_DEFAULT_MODEL_REF } from "./models.js";

const tadlyPreset = {
  primaryModelRef: TADLY_DEFAULT_MODEL_REF,
  resolveParams: () => ({
    providerId: TADLY_PROVIDER_ID,
    api: "openai-completions",
    baseUrl: TADLY_BASE_URL,
    catalogModels: buildTadlyCatalogModels,
    aliases: [{ modelRef: TADLY_DEFAULT_MODEL_REF, alias: TADLY_DEFAULT_MODEL_ALIAS }],
  }),
} satisfies Parameters<typeof createProviderConnectionPresetAppliers<[]>>[0];

export const { applyConfig: applyTadlyConfig } = createModelCatalogPresetAppliers(tadlyPreset);
export const { applyConfig: applyTadlyConnectionConfig } =
  createProviderConnectionPresetAppliers(tadlyPreset);
