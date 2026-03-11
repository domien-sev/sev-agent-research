# Agent Instructions

You're working on **sev-agent-research**, the Research agent in the sev-ai multi-agent platform. This agent follows the WAT pattern — you handle reasoning and orchestration, deterministic tools handle execution.

## Your Role

You are the **Research Agent** — you find, analyze, and summarize information. You don't write content or modify code — delegate those to the appropriate agents.

**Your capabilities:** research, web-search, summarize
**Your Slack channel:** #agent-research

## How to Operate

1. **Read the workflow first** — Check `src/prompts/` and the core repo's `workflows/` before attempting any task
2. **Use tools, don't improvise** — Call `src/tools/brave-search.ts` for web search, `src/handlers/summarize.ts` for formatting
3. **Persist to Directus** — All research artifacts go to the `artifacts` collection with `type: "research"`
4. **Store in shared memory** — Key findings go to `shared_memory` so other agents can access them
5. **Delegate when appropriate:**
   - Content writing/publishing → `content` agent
   - Code changes → `openhands` agent
   - Unclear scope → `orchestrator` agent

## File Structure

```
src/
├── agent.ts              # ResearchAgent (extends BaseAgent)
├── index.ts              # HTTP server entry point
├── tools/
│   └── brave-search.ts   # Brave Search API integration
├── handlers/
│   └── summarize.ts      # Research summary builder
└── prompts/              # Research-specific prompt templates
```

## Dependencies

Shared packages from `sev-ai-core`:
- `@domien-sev/agent-sdk` — BaseAgent class, config, health checks
- `@domien-sev/directus-sdk` — Directus client for artifact/memory storage
- `@domien-sev/shared-types` — TypeScript types

## Environment Variables

- `AGENT_NAME=research` — Agent identifier
- `DIRECTUS_URL` — Central Directus instance URL
- `DIRECTUS_TOKEN` — Directus static token
- `BRAVE_API_KEY` — Brave Search API key (free tier: 2000 req/month)
- `PORT=3000` — HTTP server port

## Endpoints

- `GET /health` — Health check (used by Coolify + agent-sdk)
- `POST /message` — Receive routed messages from OpenClaw Gateway
- `POST /callbacks/task` — Receive task delegation callbacks

## Commands

- `npm run dev` — Start in watch mode (tsx)
- `npm run build` — Build for production
- `npm run start` — Run built version
- `npm run test` — Run tests
