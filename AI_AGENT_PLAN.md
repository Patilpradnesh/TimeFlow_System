# 🤖 TIMEFLOW — AI AGENT INTELLIGENCE LAYER
### Full Development Plan for the Behavioral Analysis & Recovery AI System

> **Status:** Agent Socket Layer Prepared. Real Agent Integration Pending.
> **Philosophy:** We build the PIPES first. The AI agent is plugged in at the end, not scattered throughout.
> **Rule:** NO fake AI. NO mock responses in production. Agent runs only when it is truly connected.

---

## 🧠 WHAT WE ARE BUILDING

TimeFlow's AI is not a chatbot. It is a **Behavioral Intelligence Agent** — a background system that silently watches your execution patterns, finds deep behavioral trends, and surfaces precise, non-judgmental guidance at the right moment.

It will never say "You're doing great!" It will say:
> *"You paused 4 times on database-related tasks last week, always between 9–11 PM. Consider scheduling this work before 7 PM when your energy rating averages 8.2/10."*

This is the difference between a chatbot and a **Process Intelligence Agent**.

---

## 🏗️ ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                        TIMEFLOW SYSTEM                          │
│                                                                 │
│   Frontend (Next.js)  ──► API Gateway (Express)  ──► DB        │
│                                  │                   │          │
│                                  ▼                   │          │
│                         ┌─────────────────┐          │          │
│                         │  Agent Socket   │ ◄── Raw Behavioral  │
│                         │  Layer (Ready)  │     Data Stream     │
│                         └────────┬────────┘                     │
│                                  │                              │
│                                  ▼                              │
│                     ┌────────────────────────┐                  │
│                     │   AI AGENT RUNTIME     │  (Plugged in     │
│                     │  (Future Integration)  │   LATER)         │
│                     │                        │                  │
│                     │  • LLM Provider        │                  │
│                     │  • Agent Framework     │                  │
│                     │  • Tool Definitions    │                  │
│                     └────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Principle:** The Agent reads from the database. It does NOT touch core business logic.
The entire app works 100% without the agent. The agent only adds intelligence on top.

---

## 🎯 THE 4 AGENTS WE WILL BUILD

Each agent is a **single-responsibility module** with its own folder, tools, and context window.

---

### AGENT 1 — RoadmapGeneratorAgent
**Trigger:** User creates a new Goal.
**Job:** Convert a vague user goal into a structured, time-aware `Process ➔ Phase ➔ Task` roadmap.

**Input it receives:**
```json
{
  "goal": "Crack Google SWE interview in 3 months",
  "userIndustry": "TECH",
  "availableHoursPerWeek": 12,
  "currentSkillLevel": "Junior"
}
```

**Output it must produce (strict JSON):**
```json
{
  "processTitle": "Google SWE Interview Prep",
  "phases": [
    {
      "title": "Phase 1: Data Structures Foundation",
      "durationWeeks": 4,
      "tasks": [
        { "title": "Arrays & Hashing — 20 LeetCode Problems", "estimatedHours": 8 },
        { "title": "Two Pointers Pattern Study", "estimatedHours": 4 }
      ]
    }
  ]
}
```

**Where it plugs in (Backend):**
- File: `src/agents/roadmap.agent.ts`
- Trigger: `POST /api/processes/generate-from-goal`
- Hook point in DB: `Process` table — Prisma `create` call is already wired.

---

### AGENT 2 — RecoveryAgent
**Trigger:** User pauses a task AND submits a `ProcrastinationReason`.
**Job:** Immediately surface a tiny, actionable "micro-recovery" step to break the resistance loop.

**Context window it receives (from DB):**
```json
{
  "task": { "title": "...", "why": "..." },
  "pauseReason": "TOO_DIFFICULT",
  "lastSessionDurationMinutes": 7,
  "recentPauseHistory": ["TOO_DIFFICULT", "OVERWHELMED", "UNCLEAR_START"],
  "currentEnergyLevel": "LOW",
  "timeOfDay": "22:30"
}
```

**Output it must produce:**
```json
{
  "recoveryType": "SHRINK",
  "message": "You've hit this wall 3 times. Don't try to solve the whole thing — just write out the inputs and expected output of the problem on paper. That's it. 5 minutes.",
  "suggestedMicroStep": "Write the function signature and expected I/O on paper"
}
```

**Where it plugs in (Backend):**
- File: `src/agents/recovery.agent.ts`
- Trigger: Called from `behavior.controller.ts` inside `endExecutionSession()` when `completed: false`
- The socket layer (`src/services/ai.service.ts`) is already stubbed for this.

---

### AGENT 3 — EvidenceAnalysisAgent
**Trigger:** User submits Proof of Work via the EIE endpoint.
**Job:** Evaluate the consistency of the evidence against the task objective. Compute a Confidence Score.

**Context window it receives:**
```json
{
  "taskTitle": "Build the JWT Auth Middleware",
  "taskWhy": "Needed to secure all API routes",
  "evidenceContent": "Finished auth middleware, added protect() function",
  "attachmentUrl": "https://github.com/user/repo/pull/12",
  "attachmentType": "url",
  "sessionDurationMinutes": 45
}
```

**Output it must produce:**
```json
{
  "confidenceScore": 91.5,
  "analysis": {
    "isConsistent": true,
    "insight": "GitHub PR URL strongly correlates to stated task objective. Session duration is consistent with complexity.",
    "redFlags": [],
    "suggestion": "Consider adding a reflection note next time to improve future AI accuracy."
  }
}
```

**Where it plugs in (Backend):**
- File: `src/agents/evidence.agent.ts`
- Trigger: Called from `eie.controller.ts` → `submitEvidence()` function
- `EvidenceScore` Prisma table is already created and wired.

---

### AGENT 4 — InsightsAgent  
**Trigger:** Weekly background job (Redis BullMQ queue).
**Job:** Analyze a user's full week of `BehaviorEvent` and `ExecutionSession` data. Generate a personalized behavioral report.

**Context window it receives (aggregated from DB):**
```json
{
  "userId": "...",
  "weekStartDate": "2026-06-30",
  "totalTasksStarted": 12,
  "totalTasksCompleted": 7,
  "avgFocusRating": 6.2,
  "avgEnergyLevel": "MEDIUM",
  "topPauseReasons": ["TOO_DIFFICULT", "DISTRACTED"],
  "topPauseTimeOfDay": "21:00 - 23:00",
  "avgActualVsPlannedRatio": 1.8,
  "avgEvidenceScore": 72.3
}
```

**Output it must produce:**
```json
{
  "weekScore": 68,
  "headline": "Strong starts, but resistance spikes after 9PM",
  "insights": [
    {
      "type": "PATTERN",
      "message": "Tasks involving unclear next-steps took 1.8x longer than estimated. Consider breaking these into MicroSteps before starting."
    },
    {
      "type": "STRENGTH",
      "message": "Your evidence score of 72% is above average. Keep attaching proof to build your behavioral credibility."
    }
  ],
  "nextWeekFocus": "Schedule complex work before 8PM. Use MicroStep planning for any task rated HIGH difficulty."
}
```

**Where it plugs in (Backend):**
- File: `src/agents/insights.agent.ts`
- Trigger: Redis BullMQ job (`weeklyInsightsQueue`) — scheduled every Sunday 11 PM
- Output stored in: New `WeeklyReport` table (to be added to Prisma schema when this phase starts)

---

## 🔌 THE SOCKET LAYER — HOW IT'S STRUCTURED NOW

This is the bridge between our system and the future real agent.

```
src/
├── services/
│   └── ai.service.ts          ← CENTRAL SOCKET LAYER (already exists)
│                                 All 4 agents plug into this file.
│                                 For now, it returns placeholder responses.
│                                 When agent is ready, just replace the function body.
│
└── agents/                    ← TO BE CREATED (one file per agent)
    ├── roadmap.agent.ts
    ├── recovery.agent.ts
    ├── evidence.agent.ts
    └── insights.agent.ts
```

**The `ai.service.ts` contract is the ONLY interface between our system and the LLM.**
Business logic controllers call `ai.service.ts`. They never touch the LLM provider directly.
This means we can swap providers (OpenAI → Gemini → Local LLaMA) by changing ONE file.

---

## 🛠️ WHAT WE NEED TO CONNECT A REAL AGENT

When you are ready to plug in a real AI agent, here is the exact checklist:

### Step 1 — Choose Agent Framework
| Framework | Best For | Notes |
|-----------|----------|-------|
| **OpenAI Agents SDK** | Fast, production-ready | Needs OpenAI API Key |
| **LangGraph** | Complex multi-step agent flows | Python-native, use via REST |
| **CrewAI** | Multi-agent teams | Good for InsightsAgent |
| **LlamaIndex** | RAG-based retrieval | If using local data + vector DB |
| **Vercel AI SDK** | Next.js native integration | Good for streaming responses to UI |

### Step 2 — Required Environment Variables (to add to `.env`)
```env
# AI Agent Configuration
OPENAI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini            # Cost-effective for our use case
AI_MAX_TOKENS=2000
AI_TEMPERATURE=0.3              # Lower = more consistent JSON outputs

# Future: Vector DB for behavioral context memory
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...
```

### Step 3 — Tool Definitions (What the Agent Can DO)
Each agent needs defined "tools" — these are functions the AI can call.

```typescript
// Example tools for RecoveryAgent
const recoveryAgentTools = [
  {
    name: "get_task_history",
    description: "Fetches the last 10 BehaviorEvents for a specific task",
    parameters: { taskId: "string" }
  },
  {
    name: "create_micro_step",
    description: "Creates a new MicroStep on a task in the database",
    parameters: { taskId: "string", title: "string" }
  },
  {
    name: "send_recovery_notification",
    description: "Pushes a recovery suggestion to the user's UI via WebSocket",
    parameters: { userId: "string", message: "string" }
  }
]
```

### Step 4 — Context Engineering Rules (Non-Negotiable)
- ✅ Always send structured JSON, never raw text prompts
- ✅ Always include a strict `response_format: { type: "json_object" }` instruction
- ✅ Cap the context window: max 10 recent behavior events per call
- ✅ System prompt must start with: *"You are an evidence-based behavioral analyst. You are non-judgmental and specific."*
- ❌ Never send full conversation history to the LLM (privacy + cost)
- ❌ Never allow open-ended outputs — every response must be validated against a TypeScript type/Zod schema before saving to DB

---

## 📊 DATA THAT IS ALREADY BEING COLLECTED (Agent-Ready)

The following data is already flowing into your database right now:

| Data Point | Table | Used By |
|------------|-------|---------|
| Task start/end timestamps | `ExecutionSession` | RecoveryAgent, InsightsAgent |
| Pause reason | `BehaviorEvent.metadata` | RecoveryAgent |
| Focus rating (1-10) | `ExecutionSession.focusRating` | InsightsAgent |
| Energy level | `ExecutionSession.energyLevel` | InsightsAgent |
| Proof of work URL | `Evidence` | EvidenceAgent |
| Evidence confidence score | `EvidenceScore` | InsightsAgent |
| Procrastination reason | `Task.reasonForProcrastination` | RecoveryAgent |

**The agent does not need to be told how to find this data. It will query it via tool calls.**

---

## 📅 WHEN TO INTEGRATE THE REAL AGENT

Follow this order — do NOT skip steps:

```
Phase 5 (Current) — Insights Dashboard (Visualize raw data, NO AI yet)
        ↓
Phase 6 — RecoveryAgent (Simplest, highest user value, connects to existing flow)
        ↓
Phase 7 — EvidenceAnalysisAgent (Replaces the mock in ai.service.ts)
        ↓
Phase 8 — RoadmapGeneratorAgent (Requires process creation UI to be finalized first)
        ↓
Phase 9 — InsightsAgent (Requires 4+ weeks of behavioral data to be meaningful)
        ↓
Phase 10 — Vector Memory (Pinecone/PG-Vector for long-term user behavioral memory)
```

---

## ⚠️ CRITICAL RULES FOR AI INTEGRATION

1. **The agent is a consumer of data, not a creator of core state.** It reads `BehaviorEvents`. It does NOT write to `Task` or `ExecutionSession` directly — only via defined `tools`.
2. **All agent outputs must be validated.** Use `Zod` schemas to validate every JSON response before writing to the DB. If the AI returns invalid JSON, log it and fail gracefully.
3. **Agents run in background queues.** NEVER call an LLM synchronously in an API request handler. Always push to a `BullMQ` Redis queue and let the worker process it asynchronously.
4. **User privacy is non-negotiable.** Never send the user's `email` or `name` to the LLM. Use anonymous `userId` only.
5. **Cost control.** Log every token used per `userId` in the `AIInteraction` table (already in schema). Add budget limits before going to production.

---

*Document Maintained by: TimeFlow Engineering*
*Last Updated: 2026-07-03*
