// Type declarations for the OpenClaw plugin SDK subpaths this plugin imports.
//
// The published `openclaw` package ships `.d.ts` files for only some
// `openclaw/plugin-sdk/*` subpaths (`plugin-entry` is one of them). The
// subpaths below have runtime JavaScript but no declarations, so this file
// declares just the parts this plugin uses. Every type is derived from the
// published `openclaw/plugin-sdk/plugin-entry` declarations, and the shapes
// follow the SDK source for the version pinned in package.json.

declare module "openclaw/plugin-sdk/provider-model-shared" {
  import type {
    OpenClawConfig,
    ProviderPlugin,
    ProviderReplayPolicy,
    ProviderReplayPolicyContext,
    ProviderResolveDynamicModelContext,
    ProviderRuntimeModel,
  } from "openclaw/plugin-sdk/plugin-entry";

  export type ModelProviderConfig = NonNullable<
    NonNullable<OpenClawConfig["models"]>["providers"]
  >[string];
  export type ModelDefinitionConfig = ModelProviderConfig["models"][number];
  export type ModelCompatConfig = NonNullable<ModelDefinitionConfig["compat"]>;

  type FamilyForwardCompatContext = {
    modelId: string;
    normalizedModelId: string;
    providerId: string;
    template?: ProviderRuntimeModel;
  };

  export function resolveFamilyForwardCompatModel(params: {
    providerId: string;
    ctx: ProviderResolveDynamicModelContext;
    cases: readonly {
      match: readonly string[] | ((normalizedModelId: string) => boolean);
      patch?:
        | Partial<ProviderRuntimeModel>
        | ((context: FamilyForwardCompatContext) => Partial<ProviderRuntimeModel> | undefined);
      templateIds?: readonly string[];
    }[];
    modelId?: string;
    normalizedModelId?: string;
    patch?: Partial<ProviderRuntimeModel>;
    preserveExisting?: boolean;
    synthesize?: boolean;
  }): ProviderRuntimeModel | undefined;

  export function buildProviderReplayFamilyHooks(options: {
    family: "openai-compatible";
    sanitizeToolCallIds?: boolean;
    dropReasoningFromHistory?: boolean;
  }): {
    buildReplayPolicy?: (ctx: ProviderReplayPolicyContext) => ProviderReplayPolicy | undefined;
  } & Partial<Pick<ProviderPlugin, "sanitizeReplayHistory" | "resolveReasoningOutputMode">>;
}

declare module "openclaw/plugin-sdk/provider-tools" {
  import type { ProviderPlugin } from "openclaw/plugin-sdk/plugin-entry";

  export function buildProviderToolCompatFamilyHooks(
    family: "deepseek" | "gemini" | "llamacpp-gbnf" | "openai",
  ): Required<Pick<ProviderPlugin, "normalizeToolSchemas" | "inspectToolSchemas">>;
}

declare module "openclaw/plugin-sdk/provider-catalog-shared" {
  import type { OpenClawConfig, ProviderPlugin } from "openclaw/plugin-sdk/plugin-entry";
  import type { ModelProviderConfig } from "openclaw/plugin-sdk/provider-model-shared";

  export function buildManifestModelProviderConfig(params: {
    providerId: string;
    catalog: unknown;
  }): ModelProviderConfig;

  export function readConfiguredProviderCatalogEntries(params: {
    config?: OpenClawConfig;
    providerId: string;
    publishedProviderId?: string;
  }): ReturnType<NonNullable<ProviderPlugin["augmentModelCatalog"]>>;
}

declare module "openclaw/plugin-sdk/provider-onboard" {
  import type { OpenClawConfig } from "openclaw/plugin-sdk/plugin-entry";
  import type {
    ModelDefinitionConfig,
    ModelProviderConfig,
  } from "openclaw/plugin-sdk/provider-model-shared";

  type AgentDefaults = NonNullable<NonNullable<OpenClawConfig["agents"]>["defaults"]>;

  export type ProviderOnboardPresetAppliers<TArgs extends unknown[]> = {
    applyProviderConfig: (cfg: OpenClawConfig, ...args: TArgs) => OpenClawConfig;
    applyConfig: (cfg: OpenClawConfig, ...args: TArgs) => OpenClawConfig;
  };

  type PresetParams<TArgs extends unknown[]> = {
    resolveParams: (
      cfg: OpenClawConfig,
      ...args: TArgs
    ) =>
      | {
          providerId: string;
          api: NonNullable<ModelProviderConfig["api"]>;
          baseUrl: string;
          catalogModels: ModelDefinitionConfig[] | (() => ModelDefinitionConfig[]);
          aliases?: readonly { modelRef: string; alias: string }[];
        }
      | null
      | undefined;
    primaryModelRef: string;
  };

  export function createModelCatalogPresetAppliers<TArgs extends unknown[]>(
    params: PresetParams<TArgs>,
  ): ProviderOnboardPresetAppliers<TArgs>;

  export function createProviderConnectionPresetAppliers<TArgs extends unknown[]>(
    params: PresetParams<TArgs>,
  ): ProviderOnboardPresetAppliers<TArgs>;

  export function resolveAgentModelPrimaryValue(model?: AgentDefaults["model"]): string | undefined;
}

declare module "openclaw/plugin-sdk/provider-entry" {
  import type {
    OpenClawConfig,
    OpenClawPluginDefinition,
    ProviderPlugin,
  } from "openclaw/plugin-sdk/plugin-entry";

  type SingleProviderPluginDefinition = {
    id?: string;
    label: string;
    docsPath: string;
    aliases?: string[];
    envVars?: string[];
    manifestAuth?: {
      defaultModel?: string;
      applyConfig?: (cfg: OpenClawConfig) => OpenClawConfig;
      noteTitle?: string;
      noteMessage?: string;
      promptMessage?: string;
    };
    catalog: {
      allowExplicitBaseUrl?: boolean;
      discoveryMode?: "strict";
      liveModelDiscovery?:
        | true
        | {
            endpointPath?: string;
            buildRequestHeaders?: (params: { apiKey?: string }) => Record<string, string>;
          };
    };
  } & Omit<
    ProviderPlugin,
    "id" | "label" | "docsPath" | "aliases" | "envVars" | "auth" | "catalog" | "staticCatalog"
  >;

  export function defineSingleProviderPluginEntry(options: {
    id: string;
    name: string;
    description: string;
    manifest?: unknown;
    provider?: SingleProviderPluginDefinition;
  }): OpenClawPluginDefinition;
}

declare module "openclaw/plugin-sdk/llm" {
  export type Tool = { name: string; description: string; parameters: Record<string, unknown> };
  export type ContentBlock =
    | { type: "text"; text: string }
    | { type: "toolCall"; id: string; name: string; arguments: Record<string, unknown> }
    | { type: string; [key: string]: unknown };
  export type AssistantMessage = {
    role: "assistant";
    content: ContentBlock[];
    stopReason: string;
    errorMessage?: string;
  };
  export type Model<TApi extends string = string> = {
    id: string;
    name?: string;
    provider: string;
    api: TApi;
    baseUrl: string;
    [key: string]: unknown;
  };
  export function completeSimple(
    model: Model,
    context: { messages: unknown[]; tools?: Tool[] },
    options?: { apiKey?: string; maxTokens?: number },
  ): Promise<AssistantMessage>;
}
