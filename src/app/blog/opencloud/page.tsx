import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Callout,
  Code,
  Em,
  H2,
  H3,
  LI,
  P,
  Pre,
  Table,
  UL,
} from "@/components/blog/Prose";

export const metadata: Metadata = {
  title: "OpenCloud: a team assistant with memory and guardrails - Yves De Boeck",
  description:
    "OpenCloud is the internal AI assistant I built for Slack and Teams, wired around MCP sidecars, persistent team memory, and unusually explicit safety controls.",
  openGraph: {
    title: "OpenCloud: a team assistant with memory and guardrails",
    description:
      "A technical write-up of an internal Slack/Teams assistant built with FastAPI, Azure AI Foundry, SQLite memory, and MCP sidecars.",
    type: "article",
  },
};

export default function Post() {
  return (
    <main className="min-h-screen px-6 py-24">
      <article className="max-w-2xl mx-auto">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-400 transition-colors mb-12"
        >
          <ArrowLeft size={14} />
          All posts
        </Link>

        <p className="font-mono text-cyan-400 text-xs tracking-widest uppercase mb-4">
          AI agents · 12 min read
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.1] mb-6">
          OpenCloud: a team assistant with memory and guardrails
        </h1>
        <p className="text-lg text-slate-400 leading-relaxed mb-16">
          I did not want to build &ldquo;another internal chatbot.&rdquo; OpenCloud is a
          real multi-channel assistant for Slack and Microsoft Teams, with Azure
          DevOps, Databricks, and Microsoft 365 sidecars, persistent team memory,
          scheduled reporting, and a security posture that is much more serious
          than the average AI demo.
        </p>

        <P>
          The first useful thing to say is simply what I actually built. I
          describe it in the README as a <Em>self-hosted team AI assistant</Em>.
          Under the hood, it is a FastAPI application, a set of MCP sidecars,
          a small React admin UI, and a SQLite-backed memory subsystem. The repo
          is named <Code>opencloud</Code>, the Python package is{" "}
          <Code>digital_colleague</Code>, and the bot persona is{" "}
          <Code>Claudio</Code>. That layering sounds slightly messy, but it is
          also a clue: this grew from concept to product rather than staying a
          toy project polished for GitHub.
        </P>
        <P>
          It also reads very clearly as professional work, not a weekend side
          project. There are dev and prod infrastructure definitions, CI
          pipelines, security-policy compliance docs, a write-operations risk
          assessment, Teams app manifests, red-team scripts, and environment
          notes about managed identities and tenant-level bot setup. I built
          this as an internal AI assistant for my employer, not as a personal
          open-source app.
        </P>

        <H2>What the system actually does</H2>
        <P>
          At a high level, OpenCloud sits inside team chat and acts like a
          working colleague rather than a blank LLM endpoint. It answers in
          Slack and Teams, can look up work items and pull requests, can search
          code and repos, can query Databricks SQL, can draft and send email
          through Microsoft 365, and keeps a persistent memory of people,
          repos, tickets, and observations.
        </P>
        <Pre>{`Slack / Teams → channel adapters → dispatch() → Agent
                                              ├─ Azure AI Foundry (gpt-4o)
                                              ├─ MCP sidecars
                                              └─ team memory (SQLite + FTS5 + vectors)`}</Pre>
        <P>
          That architecture is accurate at a glance, but the interesting part is
          how deliberately I split up the responsibilities. The main app owns
          orchestration. Sidecars own external system access. Memory is
          persisted locally. Scheduled jobs use a different, more restricted
          agent path than live user chats.
        </P>
        <Callout label="Why this had to be built like production software">
          The system carries audit-oriented risk documentation, explicit
          least-agency rules for write tools, production deployment templates,
          and organisation-facing chat integrations. That is not how I write
          hobby software when nobody else depends on it.
        </Callout>

        <H2>The core runtime is intentionally simple</H2>
        <P>
          The startup sequence in <Code>src/digital_colleague/main.py</Code>
          tells the story well. On boot, the app initializes SQLite, builds the
          Agent Framework client, connects whatever MCP sidecars are configured,
          creates two agents, starts Slack Socket Mode if enabled, and finally
          starts APScheduler.
        </P>
        <Pre>{`1. Init SQLite DB
2. Build Agent Framework client
3. Connect MCP sidecars
4. Create full Agent + stateless reporting Agent
5. Start Slack Socket Mode
6. Start APScheduler`}</Pre>
        <P>
          I kept this boring on purpose. There is one main FastAPI process, not
          a maze of workers. The interesting separation is logical, not
          infrastructural: the app creates a full agent for live conversations
          and a <Em>stateless reporting agent</Em> for scheduled jobs. That
          reporting agent has no session history and gets only restricted MCP
          tool access.
        </P>
        <P>
          That one decision removes a surprising amount of risk. Scheduled jobs
          are where assistants get dangerous, because they run without a human
          watching. I made unattended runs structurally weaker than interactive
          ones, rather than trusting a prompt to behave differently on a cron
          trigger.
        </P>

        <H2>The sidecar boundary is the real design decision</H2>
        <P>
          The biggest architectural choice here is not the model. It is my
          decision to put enterprise integrations behind MCP sidecars instead of
          baking SDK calls straight into the agent app.
        </P>
        <P>
          There are three sidecar services: Azure DevOps, Databricks,
          and Microsoft 365. Each has its own auth, settings, and tool surface.
          The main agent connects to them over streamable HTTP MCP and can
          expose either the full toolset or a read-only subset.
        </P>
        <Pre>{`reporting = MCPStreamableHTTPTool(
  name="ado_reporting",
  url=url,
  tool_name_prefix="ado_",
  allowed_tools=ADO_READ_ONLY_TOOLS,
)`}</Pre>
        <P>
          That is the kind of detail I care about. The read-only policy is not a
          prompt asking the model to behave. It is an allowlist enforced by the
          tool wrapper. The Databricks SQL sidecar does the same thing by only
          permitting statements matching <Code>SELECT</Code>, <Code>SHOW</Code>,{" "}
          <Code>DESCRIBE</Code>, <Code>EXPLAIN</Code>, and <Code>WITH</Code>.
          The M365 mail sidecar makes sending a two-step draft-then-send flow.
        </P>
        <P>
          Operationally, the sidecars also make the deployment cleaner. Each
          external system gets its own auth path and failure boundary. The main
          app does not need to know how to speak every service&apos;s SDK; it only
          needs to know how to call tools.
        </P>

        <H2>The memory model is better than &ldquo;chat history&rdquo;</H2>
        <P>
          The memory subsystem is the part I am proudest of.
          There is a long-term <Code>memories</Code> table keyed by{" "}
          <Code>team_id</Code>, with FTS5 for keyword search and{" "}
          <Code>sqlite-vec</Code> for semantic search. That alone would be
          standard. The more interesting part is the rolling{" "}
          <Code>chat_buffer</Code>.
        </P>
        <P>
          In Teams, every inbound message is persisted, even when the bot was
          not mentioned. Group chats only invoke the model on a personal message
          or an explicit <Code>@mention</Code>, but the bot still records the
          rest as passive context. When someone finally does ask it something,
          unseen messages are injected into the prompt so it can answer in the
          context of the conversation it has silently observed.
        </P>
        <Pre>{`def should_invoke_agent(activity: Activity) -> bool:
    return is_personal_chat(activity) or is_bot_mentioned(activity)`}</Pre>
        <P>
          That is a neat middle ground between two bad options: replying to
          everything, or knowing nothing unless directly addressed. OpenCloud
          stays quiet in group chat, but it is not blind.
        </P>
        <P>
          Then there is a second step. A consolidation sweep runs every 15
          minutes and asks the reporting agent to promote only durable facts
          from that buffer into long-term memory. Decisions, ownership, and
          recurring context survive; small talk does not.
        </P>
        <Callout label="The design I am most pleased with">
          I treat memory as a pipeline, not a magical feature. Raw
          chat first lands in a cheap buffer, then only the durable pieces are
          distilled into long-term memory. That is a much saner design than
          pretending every message deserves permanent storage.
        </Callout>
        <P>
          There is one honest asymmetry here: Teams gets this durable
          buffer-and-consolidate model, while Slack mostly reconstructs thread
          context on demand. That is practical, but it means the assistant&apos;s
          memory behaviour is not identical across channels yet.
        </P>

        <H2>The guardrails are not decorative</H2>
        <P>
          A lot of internal AI projects say the word &ldquo;safety&rdquo; and then stop at
          a system prompt. I went further than that. External content
          from work items, emails, and files is wrapped in explicit
          <Code>[EXTERNAL-CONTENT]</Code> tags so the model is told to treat it
          as data, not instructions. The system prompt has direct prompt
          injection detection rules. Memory tools reject things that look like
          passwords, tokens, API keys, JWTs, or connection strings. Incoming
          chat can be screened with Azure AI Content Safety before it ever hits
          the agent.
        </P>
        <Table
          head={["risk", "mitigation in code", "effect"]}
          rows={[
            ["prompt injection in external data", "explicit content wrapping + system-prompt rules", "tool output is treated as data, not authority"],
            ["credentials stored in memory", "regex-based credential guard in remember_fact()", "secrets are rejected before persistence"],
            ["scheduled job overreach", "stateless reporting agent + read-only MCP allowlists", "unattended runs cannot use broad write tools"],
            ["email misuse", "draft_email → send_email two-step gate", "sending requires an explicit confirmation flow"],
          ]}
        />
        <P>
          I also built a red-team runner with 12 adversarial probes
          across jailbreak, cross-prompt injection, credential fishing, and
          harmful-content categories. According to the evaluation doc, the
          latest run refused all 12. More importantly, the harness exists at
          all. My engineering goal here was not &ldquo;ship a bot&rdquo; but
          &ldquo;ship something we can defend.&rdquo;
        </P>

        <H2>Deployment stays small by accepting a hard limit</H2>
        <P>
          The recommended deployment target is Azure Container Apps: one main
          app container plus internal sidecars, Azure Files mounted at{" "}
          <Code>/data</Code>, and managed identity for most cloud auth. The
          infrastructure code sizes the main app at 1 vCPU / 2 GB and the
          sidecars at 0.25 vCPU / 0.5 GB each.
        </P>
        <Table
          head={["container", "role", "statefulness"]}
          rows={[
            ["opencloud-app", "FastAPI app, agent runtime, Slack/Teams entrypoint", "stateful via SQLite on Azure Files"],
            ["ado-mcp", "Azure DevOps tools", "stateless"],
            ["dbx-mcp", "Databricks tools", "stateless"],
            ["m365-mcp", "Mail and SharePoint tools", "stateless"],
          ]}
        />
        <P>
          The tradeoff is one I made explicit in the deployment docs: since
          SQLite backs the memory store, the app has to stay at one replica.
          That is not a hidden weakness; it is written down as a design
          constraint. The upside is a very low-complexity deployment. The
          downside is that scale-out and high-write concurrency are off the
          table until the storage layer moves to PostgreSQL and{" "}
          <Code>pgvector</Code>.
        </P>
        <P>
          There is another practical detail worth calling out: Slack works
          entirely over outbound Socket Mode, so it can stay private, but Teams
          needs inbound access to <Code>POST /api/messages</Code>. That kind of
          boring network reality shapes real systems more than model
          benchmarks do.
        </P>

        <H2>The observability story is unusually mature</H2>
        <P>
          OpenCloud is not just instrumented; it is instrumented in layers.
          I use Langfuse for LLM-native tracing and online evaluation, Azure
          Monitor for platform health, and Azure AI Foundry evaluators for batch
          quality and red-team gates in CI. I tried to be specific about what
          each platform is for, which I think is exactly the right way to think
          about it.
        </P>
        <H3>That split makes sense</H3>
        <UL>
          <LI>
            <Em>Langfuse</Em> answers: what happened in this conversation, what
            did it cost, and is quality drifting?
          </LI>
          <LI>
            <Em>Azure Monitor</Em> answers: is the app healthy, failing, or
            getting slower?
          </LI>
          <LI>
            <Em>AI Foundry evals</Em> answer: is this version safe and good
            enough to deploy?
          </LI>
        </UL>
        <P>
          I also tried to be honest in the code here. Content safety is
          fail-open if the service errors, because blocking real users due to a
          guardrail outage is its own failure mode. I do not think that choice
          is universally right, but it is explicit and defensible.
        </P>

        <H2>What I would change</H2>
        <P>
          The first thing I would change is the storage ceiling. SQLite is a
          perfectly reasonable starting point for this product, especially with
          Azure Files and a single replica, but I already know the upgrade path:
          PostgreSQL plus <Code>pgvector</Code>. If adoption grows,
          that migration stops being optional.
        </P>
        <P>
          Second, I would make the naming more coherent. OpenCloud, Digital
          Colleague, and Claudio all make sense in isolation, but together they
          advertise the project&apos;s history a bit too loudly.
        </P>
        <P>
          Third, I would close the channel gap between Slack and Teams so the
          memory model behaves the same everywhere. Right now the most ambitious
          context-awareness logic lives on the Teams side.
        </P>
        <P>
          And finally, I would add a more visible degraded-mode signal for
          safety dependencies. Passing through when Content Safety is down may be
          the right runtime behavior, but I would still want that state to be
          impossible to miss operationally.
        </P>

        <H2>The stack</H2>
        <UL>
          <LI>
            <Em>Backend:</Em> Python 3.12, FastAPI, Microsoft Agent Framework.
          </LI>
          <LI>
            <Em>Channels:</Em> Slack Bolt Socket Mode, Microsoft Bot Framework
            for Teams.
          </LI>
          <LI>
            <Em>Model layer:</Em> Azure AI Foundry / Azure OpenAI with{" "}
            <Code>gpt-4o</Code> and <Code>text-embedding-3-small</Code>.
          </LI>
          <LI>
            <Em>Tooling boundary:</Em> MCP sidecars for Azure DevOps,
            Databricks, and Microsoft 365.
          </LI>
          <LI>
            <Em>Memory:</Em> SQLite, FTS5, sqlite-vec, plus session history and
            chat buffering.
          </LI>
          <LI>
            <Em>Scheduling and ops:</Em> APScheduler, OpenTelemetry, Langfuse,
            Azure Monitor, AI Foundry evals.
          </LI>
          <LI>
            <Em>Frontend and admin:</Em> React 19 + Vite admin UI, mounted by
            the FastAPI app when built.
          </LI>
          <LI>
            <Em>Infrastructure:</Em> Azure Container Apps, Azure Files, Key
            Vault, Bicep, Docker Compose for local/dev.
          </LI>
        </UL>
        <P>
          What I care about most with OpenCloud is that it does not pretend the
          hard part of enterprise AI is the prompt. The hard part is boundaries:
          tool boundaries, memory boundaries, network boundaries, and authority
          boundaries. I took those problems seriously throughout the build.
          That is why I would present it as a strong professional project: not
          because it uses a fashionable model, but because it is trying to make
          an agent safe and useful in a real team.
        </P>
      </article>
    </main>
  );
}
