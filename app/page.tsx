"use client";

import {
  BrainCircuit,
  Check,
  Clipboard,
  FileCode2,
  FileText,
  Flag,
  Gauge,
  Layers3,
  MessageSquarePlus,
  PanelRight,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Wand2
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import {
  type Agent,
  type AgentName,
  type AgentStatus,
  type ArtifactKey,
  type ContextField,
  type OrchestrationPhase,
  type ProductContext,
  artifactKeys,
  baseAgents,
  buildArtifactsFromPrd,
  buildPrdDocument,
  chooseAgentsForRefinement,
  contextCompleteness,
  contextQuestions,
  nextMissingQuestion,
  refinePrd,
  runAgent,
  writeFollowUpAnalysis,
  writeOpeningAnalysis
} from "@/lib/northstar-orchestration";
import { cn } from "@/lib/utils";

type Role = "user" | "assistant";

type Project = {
  id: string;
  name: string;
  summary: string;
  stage: "Discovery" | "Drafting" | "Ready";
};

type Message = {
  id: string;
  role: Role;
  content: string;
};

type AgentLog = {
  id: string;
  agent: AgentName;
  content: string;
};

const initialProjects: Project[] = [
  {
    id: "p1",
    name: "Long-Form Creator Studio",
    summary: "Guided long-form creation workflow for TikTok creators",
    stage: "Discovery"
  },
  {
    id: "p2",
    name: "Creator Search",
    summary: "Search and research tools for creators in TikTok Studio",
    stage: "Drafting"
  }
];

const starterMessages: Message[] = [
  {
    id: "m1",
    role: "assistant",
    content:
      "[Orchestrator] Share the rough product idea. I will identify missing context across Strategy, Design, Metrics, Risk, Engineering, and PRD agents before drafting the PRD."
  }
];

const phaseSeed: OrchestrationPhase[] = [
  {
    id: "analyze",
    label: "Analyzing product idea",
    detail: "Waiting for first user idea.",
    agents: ["Strategy Agent"],
    status: "idle"
  },
  {
    id: "context",
    label: "Identifying missing context",
    detail: "Building the agent context checklist.",
    agents: ["Strategy Agent", "Metrics Agent", "Risk Agent"],
    status: "idle"
  },
  {
    id: "dispatch",
    label: "Dispatching agents",
    detail: "Routing work to specialist agents.",
    agents: ["Strategy Agent", "Design Agent", "Metrics Agent"],
    status: "idle"
  },
  {
    id: "parallel",
    label: "Parallel execution",
    detail: "Agents produce their sections.",
    agents: ["Design Agent", "Metrics Agent", "Risk Agent", "Engineering Agent"],
    status: "idle"
  },
  {
    id: "draft",
    label: "Artifact drafting",
    detail: "PRD Agent merges one readable document.",
    agents: ["PRD Agent"],
    status: "idle"
  },
  {
    id: "review",
    label: "Review and refinement",
    detail: "User comments can call the right agent back in.",
    agents: ["PRD Agent"],
    status: "idle"
  }
];

const agentIcons: Record<AgentName, typeof Target> = {
  "Strategy Agent": Target,
  "PRD Agent": FileText,
  "Metrics Agent": Gauge,
  "Design Agent": Layers3,
  "Risk Agent": ShieldCheck,
  "Engineering Agent": FileCode2
};

function nowId(prefix: string) {
  return `${prefix}${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
}

function setAgentGroupStatus(agents: Agent[], names: AgentName[], status: AgentStatus) {
  return agents.map((agent) => (names.includes(agent.name) ? { ...agent, status } : agent));
}

function updatePhase(
  phases: OrchestrationPhase[],
  id: string,
  status: AgentStatus,
  detail?: string
) {
  return phases.map((phase) => (phase.id === id ? { ...phase, status, detail: detail ?? phase.detail } : phase));
}

const defaultContext: ProductContext = {
  idea: "Guided long-form creation workflow for TikTok creators"
};

const defaultPrd = buildPrdDocument(defaultContext);

export default function Home() {
  const [projects, setProjects] = useState(initialProjects);
  const [activeProjectId, setActiveProjectId] = useState(initialProjects[0].id);
  const [messages, setMessages] = useState(starterMessages);
  const [input, setInput] = useState("");
  const [context, setContext] = useState<ProductContext>({});
  const [agents, setAgents] = useState<Agent[]>(baseAgents);
  const [phases, setPhases] = useState<OrchestrationPhase[]>(phaseSeed);
  const [agentLog, setAgentLog] = useState<AgentLog[]>([]);
  const [activeArtifact, setActiveArtifact] = useState<ArtifactKey>("PRD");
  const [copiedArtifact, setCopiedArtifact] = useState<ArtifactKey | null>(null);
  const [artifacts, setArtifacts] = useState<Record<ArtifactKey, string>>(
    buildArtifactsFromPrd(defaultPrd, defaultContext)
  );

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0];
  const completedAgents = useMemo(
    () => agents.filter((agent) => agent.status === "completed").length,
    [agents]
  );
  const contextProgress = contextCompleteness(context);
  const prdReady = agents.find((agent) => agent.name === "PRD Agent")?.status === "completed";

  function addAssistant(content: string) {
    setMessages((current) => [
      ...current,
      {
        id: nowId("a"),
        role: "assistant",
        content
      }
    ]);
  }

  function createProject() {
    const nextNumber = projects.length + 1;
    const project: Project = {
      id: `p${Date.now()}`,
      name: `Untitled Product ${nextNumber}`,
      summary: "New PM discovery workspace",
      stage: "Discovery"
    };

    setProjects([project, ...projects]);
    setActiveProjectId(project.id);
    setMessages(starterMessages);
    setContext({});
    setAgents(baseAgents);
    setPhases(phaseSeed);
    setAgentLog([]);
    setArtifacts(buildArtifactsFromPrd(buildPrdDocument({ idea: project.summary }), { idea: project.summary }));
    setActiveArtifact("PRD");
  }

  function selectProject(project: Project) {
    const selectedContext = project.stage === "Discovery" ? {} : { idea: project.summary };

    setActiveProjectId(project.id);
    setMessages(starterMessages);
    setContext(selectedContext);
    setAgents(baseAgents);
    setPhases(phaseSeed);
    setAgentLog([]);
    setArtifacts(buildArtifactsFromPrd(buildPrdDocument(selectedContext), selectedContext));
    setActiveArtifact("PRD");
  }

  function patchActiveProject(stage: Project["stage"], summary?: string) {
    setProjects((current) =>
      current.map((project) =>
        project.id === activeProjectId
          ? {
              ...project,
              stage,
              summary: summary ?? project.summary
            }
          : project
      )
    );
  }

  function beginOrchestration(completeContext: ProductContext) {
    const workerAgents: AgentName[] = [
      "Strategy Agent",
      "Design Agent",
      "Metrics Agent",
      "Risk Agent",
      "Engineering Agent"
    ];

    setActiveArtifact("PRD");
    setPhases((current) =>
      updatePhase(
        updatePhase(updatePhase(current, "context", "completed", "All required context has been captured."), "dispatch", "thinking", "Dispatching Strategy, Design, Metrics, Risk, and Engineering agents."),
        "analyze",
        "completed",
        "Product idea and user answers analyzed."
      )
    );
    setAgents((current) => setAgentGroupStatus(current, workerAgents, "thinking"));

    setTimeout(() => {
      const outputs = workerAgents.map((agentName) => ({
        agentName,
        output: runAgent(agentName, completeContext)
      }));

      setAgentLog((current) => [
        ...current,
        ...outputs.map(({ agentName, output }) => ({
          id: nowId("log"),
          agent: agentName,
          content: output.summary
        }))
      ]);
      setAgents((current) =>
        current.map((agent) => {
          const found = outputs.find((item) => item.agentName === agent.name);
          return found ? { ...agent, status: "completed", summary: found.output.summary } : agent;
        })
      );
      setPhases((current) =>
        updatePhase(
          updatePhase(current, "dispatch", "completed", "Agents received scoped work packets."),
          "parallel",
          "thinking",
          "Strategy, Design, Metrics, Risk, and Engineering are collaborating."
        )
      );
      addAssistant(`[Orchestrator] Intermediate update:
- Strategy Agent framed the user, wedge, scope, and non-goals.
- Design Agent drafted the product framework, mobile wireframe, and flow chart.
- Metrics Agent defined ultimate, intermediate, and guardrail metrics.
- Risk Agent identified copyright, policy, safety, and cost controls.
- Engineering Agent mapped surfaces, events, and service needs.

Now I am calling the PRD Agent to merge these into one document.`);

      setAgents((current) => setAgentGroupStatus(current, ["PRD Agent"], "thinking"));

      setTimeout(() => {
        const specialistMarkdown = outputs.map(({ output }) => output.markdown);
        const prdOutput = runAgent("PRD Agent", completeContext, specialistMarkdown);
        const nextArtifacts = buildArtifactsFromPrd(prdOutput.markdown, completeContext);

        setArtifacts(nextArtifacts);
        setAgentLog((current) => [
          ...current,
          {
            id: nowId("log"),
            agent: "PRD Agent",
            content: prdOutput.summary
          }
        ]);
        setAgents((current) => setAgentGroupStatus(current, ["PRD Agent"], "completed"));
        setPhases((current) =>
          updatePhase(
            updatePhase(
              updatePhase(current, "parallel", "completed", "Specialist outputs are complete."),
              "draft",
              "completed",
              "One consolidated PRD is ready in the right panel."
            ),
            "review",
            "thinking",
            "Comment in chat to revise the PRD; the orchestrator will call the right agent."
          )
        );
        patchActiveProject("Ready", completeContext.idea?.slice(0, 86));
        addAssistant(`[Final output] The PRD is ready in the right panel.

You can now comment in chat, for example:
- "Make the metrics more TikTok-style"
- "Add a better mobile flow"
- "Tighten the risk review around copyright"

I will route the change to the right specialist agent and update the PRD.`);
      }, 1200);
    }, 900);
  }

  function refineCurrentPrd(comment: string) {
    const calledAgents = chooseAgentsForRefinement(comment);

    setAgents((current) => setAgentGroupStatus(current, calledAgents, "thinking"));
    setPhases((current) =>
      updatePhase(
        updatePhase(current, "dispatch", "thinking", `Dispatching refinement to ${calledAgents.join(", ")}.`),
        "review",
        "thinking",
        "Reviewing user comment and updating PRD."
      )
    );
    addAssistant(`[Orchestrator] I read your PRD feedback and I am routing it to: ${calledAgents.join(", ")}.

Reasoning:
- I matched the comment to the PRD sections it affects.
- Specialist agents will revise their source sections first.
- PRD Agent will merge the change back into the single PRD document.`);

    setTimeout(() => {
      const summaries = calledAgents.map((agentName) => {
        if (agentName === "PRD Agent") {
          return "Merged the requested change into the PRD revision note and acceptance criteria.";
        }

        return runAgent(agentName, context).summary;
      });
      const refinedPrd = refinePrd(artifacts.PRD, comment, calledAgents);

      setArtifacts((current) => ({
        ...current,
        PRD: refinedPrd
      }));
      setAgents((current) =>
        current.map((agent) =>
          calledAgents.includes(agent.name)
            ? { ...agent, status: "completed", summary: summaries[calledAgents.indexOf(agent.name)] }
            : agent
        )
      );
      setAgentLog((current) => [
        ...current,
        ...calledAgents.map((agentName, index) => ({
          id: nowId("log"),
          agent: agentName,
          content: summaries[index]
        }))
      ]);
      setPhases((current) =>
        updatePhase(
          updatePhase(current, "dispatch", "completed", "Refinement agents completed their pass."),
          "review",
          "completed",
          "PRD has been updated from the user comment."
        )
      );
      setActiveArtifact("PRD");
      addAssistant("[Review/refinement] I updated the PRD based on your comment. The revised document is in the right panel.");
    }, 900);
  }

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = input.trim();
    if (!content) {
      return;
    }

    setInput("");
    setMessages((current) => [
      ...current,
      {
        id: nowId("u"),
        role: "user",
        content
      }
    ]);

    if (prdReady && context.idea) {
      refineCurrentPrd(content);
      return;
    }

    if (!context.idea) {
      const nextContext = { ...context, idea: content };
      const missing = nextMissingQuestion(nextContext);

      setContext(nextContext);
      patchActiveProject("Drafting", content.slice(0, 86));
      setPhases((current) =>
        updatePhase(
          updatePhase(current, "analyze", "thinking", "Analyzing product idea and likely agent needs."),
          "context",
          "thinking",
          "Building missing-context checklist for all specialist agents."
        )
      );
      setTimeout(() => {
        setPhases((current) =>
          updatePhase(
            updatePhase(current, "analyze", "completed", "Product idea analyzed."),
            "context",
            "thinking",
            `Next context area: ${missing?.label ?? "ready for dispatch"}.`
          )
        );
        addAssistant(writeOpeningAnalysis(nextContext));
      }, 450);
      return;
    }

    const missing = nextMissingQuestion(context);

    if (!missing) {
      refineCurrentPrd(content);
      return;
    }

    const nextContext = {
      ...context,
      [missing.field]: content
    };
    const next = nextMissingQuestion(nextContext);

    setContext(nextContext);
    setPhases((current) =>
      updatePhase(
        current,
        "context",
        next ? "thinking" : "completed",
        next ? `Captured ${missing.label}. Next: ${next.label}.` : "All required context has been captured."
      )
    );
    setAgents((current) =>
      setAgentGroupStatus(
        setAgentGroupStatus(current, missing.neededBy, "completed"),
        next?.neededBy ?? [],
        "thinking"
      )
    );

    setTimeout(() => {
      addAssistant(writeFollowUpAnalysis(nextContext, missing.field as ContextField));
      if (!next) {
        beginOrchestration(nextContext);
      }
    }, 450);
  }

  async function copyArtifact() {
    await navigator.clipboard.writeText(artifacts[activeArtifact]);
    setCopiedArtifact(activeArtifact);
    setTimeout(() => setCopiedArtifact(null), 1400);
  }

  return (
    <main className="flex h-screen min-h-[720px] overflow-hidden bg-black/20 text-slate-100">
      <aside className="flex w-[292px] shrink-0 flex-col border-r border-white/10 bg-[#090b10]/92">
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-teal-500/15 text-teal-200 ring-1 ring-teal-300/20">
            <Sparkles size={18} />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-normal">Northstar</h1>
            <p className="text-xs text-slate-400">Cursor for Product Managers</p>
          </div>
        </div>

        <div className="border-b border-white/10 p-3">
          <button
            onClick={createProject}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-slate-100 text-sm font-medium text-slate-950 transition hover:bg-white"
          >
            <Plus size={16} />
            New project
          </button>
        </div>

        <div className="p-3">
          <div className="flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 text-slate-500">
            <Search size={15} />
            <span className="text-xs">Search projects</span>
          </div>
        </div>

        <nav className="thin-scrollbar flex-1 space-y-1 overflow-y-auto px-2 pb-4">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => selectProject(project)}
              className={cn(
                "w-full rounded-md px-3 py-3 text-left transition",
                project.id === activeProjectId
                  ? "bg-white/[0.09] ring-1 ring-white/10"
                  : "hover:bg-white/[0.05]"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-medium">{project.name}</span>
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                    project.stage === "Ready"
                      ? "bg-teal-400/14 text-teal-200"
                      : project.stage === "Drafting"
                        ? "bg-orange-400/14 text-orange-200"
                        : "bg-slate-500/16 text-slate-300"
                  )}
                >
                  {project.stage}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{project.summary}</p>
            </button>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <p className="text-xs font-medium text-slate-300">Context checklist</p>
          <div className="mt-3 space-y-2">
            {[{ field: "idea" as ContextField, label: "Idea" }, ...contextQuestions].map((item) => (
              <div key={item.field} className="flex items-center gap-2 text-xs text-slate-500">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    context[item.field] ? "bg-teal-300" : "bg-slate-700"
                  )}
                />
                <span className={context[item.field] ? "text-slate-300" : ""}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-white/10 bg-[#0d1017]/78 px-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Flag size={16} className="text-orange-300" />
              <h2 className="truncate text-sm font-semibold">{activeProject.name}</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">AI PM Orchestrator workspace</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>{completedAgents}/6 agents complete</span>
            <div className="h-2 w-32 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-teal-300 transition-all"
                style={{ width: `${contextProgress}%` }}
              />
            </div>
          </div>
        </header>

        <div className="border-b border-white/10 bg-[#0b0e14]/62 px-5 py-3">
          <div className="thin-scrollbar flex gap-2 overflow-x-auto">
            {phases.map((phase) => {
              const Icon = agentIcons[phase.agents[0]];
              return (
                <div
                  key={phase.id}
                  className="min-w-[220px] rounded-md border border-white/10 bg-white/[0.035] p-3"
                >
                  <div className="flex items-center gap-2">
                    <Icon size={14} className="text-teal-200" />
                    <span className="truncate text-xs font-medium">{phase.label}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">{phase.detail}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        phase.status === "completed"
                          ? "bg-teal-300"
                          : phase.status === "thinking"
                            ? "bg-orange-300"
                            : "bg-slate-700"
                      )}
                    />
                    <span className="text-[11px] capitalize text-slate-400">{phase.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="thin-scrollbar flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
              >
                {message.role === "assistant" ? (
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-teal-500/14 text-teal-200 ring-1 ring-teal-300/20">
                    <BrainCircuit size={16} />
                  </div>
                ) : null}
                <div
                  className={cn(
                    "max-w-[86%] whitespace-pre-wrap rounded-lg px-4 py-3 text-sm leading-6 shadow-panel",
                    message.role === "user"
                      ? "bg-slate-100 text-slate-950"
                      : "border border-white/10 bg-white/[0.045] text-slate-200"
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-white/10 bg-[#0b0e14]/86 p-4">
          <form onSubmit={submitMessage} className="mx-auto max-w-3xl">
            <div className="rounded-lg border border-white/12 bg-white/[0.045] p-2 shadow-panel focus-within:border-teal-300/40">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={
                  prdReady
                    ? "Comment on the PRD. The orchestrator will call the right agent..."
                    : "Describe the idea or answer the orchestrator's next question..."
                }
                className="min-h-24 w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500"
              />
              <div className="flex items-center justify-between border-t border-white/10 px-2 pt-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Wand2 size={14} />
                  {prdReady ? "Comments trigger specialist revisions." : "Orchestrator asks before drafting."}
                </div>
                <button
                  type="submit"
                  className="grid h-9 w-9 place-items-center rounded-md bg-teal-400 text-slate-950 transition hover:bg-teal-300"
                  aria-label="Send message"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      <aside className="flex w-[500px] shrink-0 flex-col border-l border-white/10 bg-[#090b10]/92">
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          <div className="flex items-center gap-2">
            <PanelRight size={16} className="text-slate-400" />
            <h2 className="text-sm font-semibold">PRD Preview</h2>
          </div>
          <button
            onClick={copyArtifact}
            className="flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-slate-200 transition hover:bg-white/[0.08]"
          >
            {copiedArtifact === activeArtifact ? <Check size={14} /> : <Clipboard size={14} />}
            {copiedArtifact === activeArtifact ? "Copied" : "Copy Markdown"}
          </button>
        </div>

        <div className="border-b border-white/10 p-3">
          <div className="grid grid-cols-2 gap-2">
            {agents.map((agent) => {
              const Icon = agentIcons[agent.name];
              return (
                <div key={agent.name} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                  <div className="flex items-center gap-2">
                    <Icon size={15} className="text-teal-200" />
                    <span className="truncate text-xs font-medium">{agent.name}</span>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-slate-500">{agent.specialty}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        agent.status === "completed"
                          ? "bg-teal-300"
                          : agent.status === "thinking"
                            ? "bg-orange-300"
                            : "bg-slate-600"
                      )}
                    />
                    <span className="text-[11px] capitalize text-slate-400">{agent.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-b border-white/10 p-3">
          <div className="thin-scrollbar flex gap-1 overflow-x-auto">
            {artifactKeys.map((artifact) => (
              <button
                key={artifact}
                onClick={() => setActiveArtifact(artifact)}
                className={cn(
                  "h-8 shrink-0 rounded-md px-3 text-xs font-medium transition",
                  activeArtifact === artifact
                    ? "bg-slate-100 text-slate-950"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
                )}
              >
                {artifact}
              </button>
            ))}
          </div>
        </div>

        {agentLog.length ? (
          <div className="border-b border-white/10 p-3">
            <p className="mb-2 text-xs font-medium text-slate-300">Inter-agent collaboration</p>
            <div className="thin-scrollbar flex max-h-24 flex-col gap-2 overflow-y-auto">
              {agentLog.slice(-5).map((log) => {
                const Icon = agentIcons[log.agent];
                return (
                  <div key={log.id} className="flex gap-2 text-xs leading-5 text-slate-400">
                    <Icon size={13} className="mt-1 shrink-0 text-teal-200" />
                    <span>
                      <span className="font-medium text-slate-300">{log.agent}:</span> {log.content}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="thin-scrollbar flex-1 overflow-y-auto p-5">
          <article className="rounded-lg border border-white/10 bg-[#0d1119] p-5">
            <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-slate-300">
              {artifacts[activeArtifact]}
            </pre>
          </article>
        </div>

        <div className="border-t border-white/10 p-4">
          <button
            onClick={() => (nextMissingQuestion(context) ? addAssistant(writeOpeningAnalysis(context)) : beginOrchestration(context))}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-orange-400 text-sm font-medium text-slate-950 transition hover:bg-orange-300"
          >
            <MessageSquarePlus size={16} />
            {nextMissingQuestion(context) ? "Show missing context" : "Run orchestration"}
          </button>
        </div>
      </aside>
    </main>
  );
}
