export type AgentStatus = "idle" | "thinking" | "completed";

export type AgentName =
  | "Strategy Agent"
  | "PRD Agent"
  | "Metrics Agent"
  | "Design Agent"
  | "Risk Agent"
  | "Engineering Agent";

export type ArtifactKey =
  | "Product Brief"
  | "PRD"
  | "Metrics Plan"
  | "Experiment Plan"
  | "A/B Report"
  | "Design Brief"
  | "Risk & Legal Checklist"
  | "Engineering Handoff";

export type Agent = {
  name: AgentName;
  specialty: string;
  status: AgentStatus;
  summary?: string;
};

export type ContextField =
  | "idea"
  | "targetUser"
  | "problem"
  | "surface"
  | "success"
  | "constraints"
  | "scope"
  | "experiment";

export type ProductContext = Partial<Record<ContextField, string>>;

export type OrchestrationPhase = {
  id: string;
  label: string;
  detail: string;
  agents: AgentName[];
  status: AgentStatus;
};

export const artifactKeys: ArtifactKey[] = [
  "Product Brief",
  "PRD",
  "Metrics Plan",
  "Experiment Plan",
  "A/B Report",
  "Design Brief",
  "Risk & Legal Checklist",
  "Engineering Handoff"
];

export const baseAgents: Agent[] = [
  { name: "Strategy Agent", specialty: "Positioning, users, scope", status: "idle" },
  { name: "PRD Agent", specialty: "Requirements and acceptance", status: "idle" },
  { name: "Metrics Agent", specialty: "Ultimate, intermediate, guardrails", status: "idle" },
  { name: "Design Agent", specialty: "UX flows, wireframes, journey", status: "idle" },
  { name: "Risk Agent", specialty: "Privacy, legal, safety", status: "idle" },
  { name: "Engineering Agent", specialty: "Systems and handoff", status: "idle" }
];

export const contextQuestions: Array<{
  field: ContextField;
  label: string;
  question: string;
  neededBy: AgentName[];
}> = [
  {
    field: "targetUser",
    label: "Target user",
    question:
      "Who is the first target user segment? Please include maturity level, region/platform if relevant, and why this segment needs the product now.",
    neededBy: ["Strategy Agent", "Design Agent", "Metrics Agent"]
  },
  {
    field: "problem",
    label: "Problem / job",
    question:
      "What is the exact creator/user problem or job-to-be-done? Where does the current workflow break down today?",
    neededBy: ["Strategy Agent", "PRD Agent", "Design Agent"]
  },
  {
    field: "surface",
    label: "Surface and flow",
    question:
      "Where should this live in the product experience, and what is the basic user path from entry point to successful outcome?",
    neededBy: ["Design Agent", "Engineering Agent", "Metrics Agent"]
  },
  {
    field: "success",
    label: "Success metrics",
    question:
      "What should success mean for the MVP: publish lift, long-form video quality, creator retention, watch time, revenue, or another business metric?",
    neededBy: ["Metrics Agent", "Strategy Agent", "PRD Agent"]
  },
  {
    field: "constraints",
    label: "Constraints / risk",
    question:
      "What constraints should shape the solution: policy, copyright, creator safety, moderation, generation cost, latency, or mobile editing complexity?",
    neededBy: ["Risk Agent", "Engineering Agent", "Design Agent"]
  },
  {
    field: "scope",
    label: "MVP scope",
    question:
      "What must be included in V1, and what should explicitly be out of scope so engineering can build a clean MVP?",
    neededBy: ["PRD Agent", "Engineering Agent", "Strategy Agent"]
  },
  {
    field: "experiment",
    label: "Experiment plan",
    question:
      "How should we test this: eligible users, control/treatment, rollout region/platform, and any segment cuts you already care about?",
    neededBy: ["Metrics Agent", "Risk Agent", "PRD Agent"]
  }
];

export function inferProductFrame(context: ProductContext) {
  const text = Object.values(context).join(" ").toLowerCase();
  const company = text.includes("tiktok") ? "TikTok" : "the product";
  const isVideo = /video|creator|tiktok|film|sports|news|learning|longer/.test(text);
  const audience = context.targetUser?.trim()
    ? context.targetUser.trim()
    : isVideo
      ? "creators who want to make longer, higher-quality videos without leaving their creation flow"
      : "users with a recurring workflow that is currently too slow, fragmented, or unclear";
  const risk = context.constraints?.trim()
    ? context.constraints.trim()
    : isVideo
      ? "copyright, platform policy, moderation, creator safety, generation cost, and latency"
      : "privacy, trust, quality, and operational constraints";

  return { company, audience, risk };
}

export function nextMissingQuestion(context: ProductContext) {
  return contextQuestions.find((item) => !context[item.field]?.trim());
}

export function contextCompleteness(context: ProductContext) {
  const answered = contextQuestions.filter((item) => context[item.field]?.trim()).length;
  return Math.round(((answered + (context.idea ? 1 : 0)) / (contextQuestions.length + 1)) * 100);
}

export function writeOpeningAnalysis(context: ProductContext) {
  const frame = inferProductFrame(context);
  const next = nextMissingQuestion(context);

  return `[Orchestrator] I understand the product idea as: ${context.idea}

I am not ready to draft the PRD yet. I need to collect enough context for the specialist agents so they do not invent strategy, metrics, UX, risk, or engineering assumptions.

Current product frame:
- Company / surface: ${frame.company}
- Likely audience: ${frame.audience}
- Likely risk areas: ${frame.risk}

Missing context I need to route to agents:
${contextQuestions
  .filter((item) => !context[item.field])
  .map((item) => `- ${item.label}: needed by ${item.neededBy.join(", ")}`)
  .join("\n")}

Next question:
${next?.question ?? "I have enough context to dispatch the agents."}`;
}

export function writeFollowUpAnalysis(context: ProductContext, capturedField: ContextField) {
  const next = nextMissingQuestion(context);
  const captured = contextQuestions.find((item) => item.field === capturedField);

  if (!next) {
    return `[Orchestrator] Context is complete enough for a PRD pass.

I am dispatching specialist agents in parallel:
- Strategy Agent: sharpen positioning, user segment, and scope.
- Design Agent: create the feature framework, wireframe, and interaction flow.
- Metrics Agent: define ultimate, intermediate, and guardrail metrics.
- Risk Agent: check policy, copyright, creator safety, and launch constraints.
- Engineering Agent: translate the MVP into implementation-ready surfaces and data needs.
- PRD Agent: merge all agent outputs into one readable PRD document.`;
  }

  return `[Orchestrator] Captured ${captured?.label ?? "context"} for ${captured?.neededBy.join(", ") ?? "the agents"}.

I still need ${contextQuestions.filter((item) => !context[item.field]).length} more context areas before drafting.

Next question:
${next.question}`;
}

function titleFromIdea(context: ProductContext) {
  const idea = context.idea || "New Product";
  if (/long|quality|video|creator/i.test(idea)) {
    return "Long-Form Creator Studio";
  }

  return idea
    .replace(/i work at|i want to|build|make|an app|a product/gi, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ") || "Northstar Product";
}

function strategyOutput(context: ProductContext) {
  const frame = inferProductFrame(context);
  const targetUser = context.targetUser || "Target user still needs to be captured.";
  const problem = context.problem || "User problem still needs to be captured.";

  return {
    summary: "Defined target segment, product thesis, MVP wedge, and launch boundaries.",
    markdown: `## Strategy Agent Output

### Product Thesis
${frame.company} should test a focused creation workflow for ${frame.audience}. The wedge is not simply "make longer videos"; it is helping creators turn a broad topic or vertical into a structured, publishable long-form story with less planning and editing friction.

### Target Segment
${targetUser}

### User Problem
${problem}

### MVP Positioning
Position the feature as a guided long-form creation assistant inside the creator workflow: it helps users choose a topic, shape a narrative, prepare assets, and understand whether the output is likely to perform.

### Non-Goals
- Do not build a full professional editing suite in V1.
- Do not optimize for every creator vertical at launch.
- Do not auto-publish or make policy-sensitive decisions without creator review.`
  };
}

function designOutput(context: ProductContext) {
  const surface = context.surface || "the selected high-intent surface";

  return {
    summary: "Created product framework, mobile wireframe, and end-to-end interaction flow.",
    markdown: `## Design Agent Output

### Product Framework
1. Entry: creator sees a contextual prompt from ${surface}.
2. Intent capture: creator selects vertical, target length, audience, and source material.
3. Planning: system creates outline, hook options, pacing plan, and asset checklist.
4. Creation: creator edits sections, adds clips, and previews pacing.
5. Review: system checks clarity, policy risk, originality, and publishing readiness.
6. Outcome: creator saves draft, exports to editor, or publishes.

### Mobile Wireframe
\`\`\`text
┌──────────────────────────────┐
│ Long-form Studio             │
│ TV/Film | Sports | News | +  │
├──────────────────────────────┤
│ What do you want to make?    │
│ [ Topic or existing video ]  │
│                              │
│ Target length                │
│ [ 1-3m ] [ 3-10m ] [ 10m+ ]  │
├──────────────────────────────┤
│ AI Plan                      │
│ Hook: ...                    │
│ Sections: 1 2 3 4            │
│ Assets needed: 5 clips       │
├──────────────────────────────┤
│ Quality Checks               │
│ Retention risk    Medium     │
│ Copyright risk    Low        │
│ Policy risk       Review     │
├──────────────────────────────┤
│ [Save draft] [Open editor]   │
└──────────────────────────────┘
\`\`\`

### Flow Chart
\`\`\`mermaid
flowchart TD
  A["Creator enters high-intent surface"] --> B["Selects vertical and long-form goal"]
  B --> C["Adds topic, source video, or prompt"]
  C --> D["AI creates outline, hook, pacing, and asset checklist"]
  D --> E["Creator edits sections and confirms direction"]
  E --> F["Quality, originality, and policy checks"]
  F --> G{"Ready?"}
  G -->|Yes| H["Save draft / Open editor / Publish path"]
  G -->|No| I["Show issues and suggested fixes"]
  I --> E
\`\`\``
  };
}

function metricsOutput(context: ProductContext) {
  return {
    summary: "Defined ultimate, intermediate, guardrail, and diagnostic metrics with segment cuts.",
    markdown: `## Metrics Agent Output

### Success Metrics
| Type | Metrics | Expectation |
| --- | --- | --- |
| Ultimate Metrics | Publish/U, qualified long-form uploads per creator, creator retention, long-form completion rate | Statistically significant lift or strong directional lift in target segment |
| Intermediate Metrics | Entry CTR, plan generation start rate, outline acceptance rate, edit completion rate, save draft rate, open editor rate | Positive lift proving funnel health |
| Consumption / Quality Metrics | VV/U, average watch time, completion rate, likes, comments, follows, not-interested rate | Improve or stay neutral |
| Guardrail Metrics | Main app StayDuration/U, report rate, copyright flags, policy review rate, generation latency, generation cost | No significant negative impact |

### Segment Cuts
- Creator size: 1K-, 1K-10K, 10K+ followers.
- Age / maturity: L5 users 30+ and younger creator cohorts.
- Vertical: TV/Film, Sports, News, Learning, and additional high-supply categories.
- Platform: iOS and Android.
- Region: US, ROW, LATAM, MENA, SSA.

### Experiment Decision Rule
Ship to the winning segments if ultimate or intermediate metrics improve and guardrails are neutral. Iterate if adoption is high but publish or quality metrics are flat. Do not ship broadly if publish behavior, creator trust, or policy signals move negative.`
  };
}

function riskOutput(context: ProductContext) {
  const frame = inferProductFrame(context);

  return {
    summary: "Identified policy, copyright, creator safety, data, and launch risks.",
    markdown: `## Risk Agent Output

### Key Risks
- Copyright and originality: long-form content may reuse clips, audio, or protected material.
- Creator safety: generated suggestions must not encourage unsafe claims, harassment, or policy-violating content.
- Platform health: pushing longer content may hurt short-form session patterns if targeted poorly.
- Cost and latency: AI planning, analysis, or generation can become expensive if used at scale.

### Required Controls
- Add policy and originality checks before export or publish.
- Keep creator in control of final script, assets, and publishing.
- Log model outputs for review and debugging.
- Gate launch to eligible users and safe regions until quality is proven.

### Constraint Summary
${frame.risk}`
  };
}

function engineeringOutput(context: ProductContext) {
  const surface = context.surface || "the selected high-intent product surface";

  return {
    summary: "Mapped MVP surfaces, APIs, event tracking, and implementation dependencies.",
    markdown: `## Engineering Agent Output

### MVP Surfaces
- Entry module in ${surface}.
- Long-form planning workspace.
- Draft handoff into editor or publishing flow.
- Review panel for quality, originality, policy, and metric readiness.

### Data and Events
- exposure, click, start_plan, submit_context, generate_outline, accept_outline, edit_section, save_draft, open_editor, publish_attempt, quality_check_result.

### Service Needs
- Prompt orchestration endpoint.
- Policy/originality check endpoint.
- Draft persistence.
- Experiment assignment and logging.

### Open Engineering Questions
- Which existing editor APIs can receive generated structure and assets?
- What latency budget is acceptable for planning and review?
- What model calls can be cached or batched?`
  };
}

function prdOutput(context: ProductContext, agentOutputs: string[]) {
  return {
    summary: "Merged agent work into one PRD document.",
    markdown: buildPrdDocument(context, agentOutputs)
  };
}

export function runAgent(agent: AgentName, context: ProductContext, agentOutputs: string[] = []) {
  if (agent === "Strategy Agent") return strategyOutput(context);
  if (agent === "Design Agent") return designOutput(context);
  if (agent === "Metrics Agent") return metricsOutput(context);
  if (agent === "Risk Agent") return riskOutput(context);
  if (agent === "Engineering Agent") return engineeringOutput(context);
  return prdOutput(context, agentOutputs);
}

export function buildPrdDocument(context: ProductContext, agentOutputs: string[] = []) {
  const title = titleFromIdea(context);
  const frame = inferProductFrame(context);
  const idea = context.idea || "A product idea to be captured through the orchestrator chat.";
  const problem = context.problem || "To be captured: current workflow pain and job-to-be-done.";
  const targetUser = context.targetUser || "To be captured: first user segment, maturity level, region/platform, and urgency.";
  const surface = context.surface || "To be captured: entry point and end-to-end user path.";
  const scope = context.scope || "To be captured: V1 must-haves and explicit non-goals.";
  const experiment =
    context.experiment ||
    "To be captured: eligible users, control/treatment, rollout region/platform, and segment cuts.";

  return `# [PRD] ${title}

## Basic Info
| Field | Details |
| --- | --- |
| PM Owner | TBD |
| Strategy POC | Strategy Agent |
| Design POC | Design Agent |
| Data POC | Metrics Agent |
| Engineering POC | Engineering Agent |
| Legal / Policy POC | Risk Agent |
| Status | Draft generated by Northstar |
| Related Links | Meego/Jira TBD, Figma TBD, Legal review TBD, Event tracking TBD, Experiment TBD |

## Change Log
| Date | Description | Owner |
| --- | --- | --- |
| Today | Initial PRD generated from ideation chat | Northstar Orchestrator |

## Intro & Goal
### What are we building?
${idea}

### Why build it?
${frame.company} has an opportunity to help ${frame.audience}. The PRD focuses on converting vague long-form creation intent into a guided, measurable workflow that can improve creator output while protecting platform quality.

### User Problem
${problem}

### Target User
${targetUser}

## Product Scope
### Surface
${surface}

### MVP Scope
${scope}

### Out of Scope
- Full professional editing suite.
- Automatic publishing without creator review.
- Broad launch before experiment and policy validation.

## Success Metrics
${metricsOutput(context).markdown.replace("## Metrics Agent Output\n\n", "")}

## Design and Interaction Model
${designOutput(context).markdown.replace("## Design Agent Output\n\n", "")}

## Requirements
### P0 Requirements
1. Provide a high-intent entry point for the target user segment.
2. Capture creator goal, vertical, target length, source material, and audience intent.
3. Generate a structured long-form plan with hook, sections, pacing, assets, and quality checks.
4. Let creators refine the plan and send it into the editor or save as a draft.
5. Track the complete funnel and guardrails.

### P1 Requirements
1. Personalize recommendations by vertical, creator maturity, and prior performance.
2. Add saved templates and revisit flows.
3. Add richer analytics explaining why a long-form draft may perform.

## Experiment Plan
### Basic Info
| Field | Details |
| --- | --- |
| Experiment Type | UID-level A/B test |
| Traffic | 50% control / 50% treatment |
| Eligibility | ${experiment} |
| Primary Segment Cuts | creator size, age/maturity, vertical, platform, region |

### Variants
| Variant | Description |
| --- | --- |
| Control | Existing creation or analytics experience |
| Treatment | Guided long-form creation workflow |

## Risk and Legal Review
${riskOutput(context).markdown.replace("## Risk Agent Output\n\n", "")}

## Engineering Handoff
${engineeringOutput(context).markdown.replace("## Engineering Agent Output\n\n", "")}

## Agent Review Notes
${agentOutputs.length ? agentOutputs.join("\n\n") : "- Specialist agent notes will appear after orchestration completes."}

## Open Questions
- Which vertical should be the first launch wedge?
- What is the acceptable latency and cost per generated plan?
- Which policy and originality checks are mandatory before export?
- Should younger users receive the same creation assistance or a restricted version?`;
}

export function buildArtifactsFromPrd(prd: string, context: ProductContext): Record<ArtifactKey, string> {
  const frame = inferProductFrame(context);
  const idea = context.idea || "A product idea to be captured through the orchestrator chat.";
  const targetUser = context.targetUser || "To be captured through clarifying questions.";
  const problem = context.problem || "To be captured through clarifying questions.";
  const experiment = context.experiment || "To be captured through clarifying questions.";

  return {
    "Product Brief": `# Product Brief

## Opportunity
${idea}

## Target User
${targetUser}

## User Problem
${problem}

## Product Thesis
${frame.company} should test a guided workflow for ${frame.audience}, starting with the smallest surface that can prove creator value and guardrail safety.

## Success Criteria
- Clear lift in ultimate or intermediate creation metrics.
- No significant negative movement in platform health, policy, or copyright guardrails.
- The target segment can complete the workflow without hand-holding.`,
    PRD: prd,
    "Metrics Plan": metricsOutput(context).markdown,
    "Experiment Plan": `# Experiment Plan

## Hypothesis
If ${frame.company} gives ${frame.audience} a guided long-form workflow, then target creators will complete more high-quality creation actions without hurting platform health.

## Test Design
| Field | Details |
| --- | --- |
| Type | UID-level A/B |
| Traffic | 50% control / 50% treatment |
| Eligibility | ${experiment} |
| Duration | 2-4 weeks or until powered |

## Variants
- Control: existing workflow.
- Treatment: guided long-form creation workflow.

## Readout
- Overall impact.
- Segment cuts by creator size, platform, region, age/maturity, and vertical.
- Qualitative review for confusing flows and AI quality.`,
    "A/B Report": `# A/B Report Draft

## Background
${context.idea}

## TL;DR
1. Launch decision: TBD after experiment.
2. Primary metric movement: TBD.
3. Segment winner or loser: TBD.
4. Guardrail readout: TBD.

## Metric Readout
| Area | Metric | Movement | Significance | Interpretation |
| --- | --- | --- | --- | --- |
| Ultimate | Publish/U, qualified long-form uploads | TBD | TBD | TBD |
| Intermediate | CTR, start, completion, save draft, open editor | TBD | TBD | TBD |
| Guardrail | StayDuration, report rate, policy flags, latency/cost | TBD | TBD | TBD |`,
    "Design Brief": designOutput(context).markdown,
    "Risk & Legal Checklist": riskOutput(context).markdown,
    "Engineering Handoff": engineeringOutput(context).markdown
  };
}

export function chooseAgentsForRefinement(comment: string): AgentName[] {
  const lower = comment.toLowerCase();
  const agents = new Set<AgentName>();

  if (/metric|success|guardrail|ultimate|intermediate|experiment|ab|a\/b|stat/.test(lower)) {
    agents.add("Metrics Agent");
  }
  if (/design|ui|ux|flow|wireframe|mock|screen|journey/.test(lower)) {
    agents.add("Design Agent");
  }
  if (/risk|legal|policy|copyright|safety|moderation|privacy/.test(lower)) {
    agents.add("Risk Agent");
  }
  if (/engineer|api|event|tracking|data|latency|system|implementation/.test(lower)) {
    agents.add("Engineering Agent");
  }
  if (/strategy|user|segment|scope|position|why|goal|mvp/.test(lower)) {
    agents.add("Strategy Agent");
  }

  agents.add("PRD Agent");
  return Array.from(agents);
}

export function refinePrd(prd: string, comment: string, agents: AgentName[]) {
  return `${prd}

## Revision Note
User feedback: ${comment}

Agents called: ${agents.join(", ")}

### PRD Agent Update
The PRD should be revised to reflect the feedback above. The relevant specialist agent sections should be treated as source of truth, then the PRD Agent should merge changes into the main document rather than creating detached notes.

### Updated Acceptance Criteria
- The requested change is incorporated into the main PRD narrative.
- Metrics, design, risk, and engineering implications are updated when affected.
- Any new assumption is called out as an open question if the user has not provided enough information.`;
}
