# Tadly provider for OpenClaw

An [OpenClaw](https://github.com/openclaw/openclaw) plugin that adds
[Tadly](https://tadly.dev) as a model provider. Tadly has an OpenAI-compatible
API at `https://api.tadly.dev/v1`.

## Install

```sh
openclaw plugins install @tadlyai/openclaw-tadly
```

Requires OpenClaw `2026.11.8` or later.

## Configure

1. Get an API key at <https://tadly.dev>.
2. Give it to OpenClaw in one of these ways:
   - Set the environment variable: `export TADLY_API_KEY=<your key>`
   - Or pass it during onboarding: `--tadly-api-key <your key>`
   - Or choose **Tadly API key** in the setup wizard.
3. Use the model `tadly/qwen3.5` (shown as **Qwen-3.5**). Onboarding sets it as
   the default model if you do not have one.

## Models

| Model ref       | Name     | Input        | Context window |
| --------------- | -------- | ------------ | -------------- |
| `tadly/qwen3.5` | Qwen-3.5 | text, image  | 131,072 tokens |

Tool calling and streaming are supported. With a key set, OpenClaw also reads
the live model list from `https://api.tadly.dev/v1/models`.

You can use any other model id Tadly serves as `tadly/<model-id>`. Models that
are not in the table above get conservative client-side limits (32,768-token
context, 8,192 output tokens, text input). These are plugin defaults, not limits
set by Tadly.

API docs: <https://tadly.dev/docs>

## Development

Requires Node.js 22 or later.

```sh
npm install
npm run typecheck   # tsc --noEmit
npm test            # vitest run (unit tests; live test is skipped)
npm run build       # compiles to dist/
```

Live test (calls the real API and uses your key):

```sh
TADLY_API_KEY=<your key> npm run test:live
```

`types/openclaw-plugin-sdk.d.ts` declares the plugin SDK subpaths that the
published `openclaw` package ships without type declarations.

## License

MIT
