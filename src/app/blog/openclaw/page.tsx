import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Callout,
  Code,
  Em,
  H2,
  LI,
  P,
  Pre,
  Table,
  UL,
} from "@/components/blog/Prose";

export const metadata: Metadata = {
  title: "OpenClaw: the assistant I actually run — Yves De Boeck",
  description:
    "How my self-hosted assistant really works in production: a Dockerized gateway on GCP, Telegram delivery, persistent state under ~/.openclaw, cron automations, and the operational tradeoffs behind it.",
  openGraph: {
    title: "OpenClaw: the assistant I actually run",
    description:
      "A production write-up of my self-hosted assistant on GCP: gateway, memory, cron, Telegram, and real operational scars.",
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
          AI agents · 14 min read
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.1] mb-6">
          OpenClaw: the assistant I actually run
        </h1>
        <p className="text-lg text-slate-400 leading-relaxed mb-16">
          The interesting part of OpenClaw is no longer the repo. It is the live
          system: a long-lived assistant running on a GCP VM, with Telegram
          delivery, persistent memory, cron jobs, backups, retries, and exactly
          the kind of operational messiness that makes software real.
        </p>

        <P>
          I used to describe OpenClaw as a personal AI assistant for my
          development workflow. That is still true, but it undersells what the
          project became once I started depending on it. It is not a chat demo.
          It is infrastructure I talk to.
        </P>
        <P>
          The source of truth for this write-up is not a local clone. It is the
          instance I actually run on a GCP VM called <Code>openclaw-gateway</Code>
          . I inspected the live config, the Docker deployment, the cron jobs,
          the persistent state, the health endpoints, and the task history. That
          turned out to be the more honest way to write about the project,
          because production tells a different story than a repository does.
        </P>
        <P>
          The story the VM tells is useful. OpenClaw is a self-hosted assistant
          organised around one long-lived gateway process. It owns the chat
          surface, the tool surface, the scheduling model, the state directory,
          and the browser control plane. The current live deployment is much
          narrower than the broader codebase: in practice it is running as a
          Telegram-first assistant with a web UI, multiple agent personas, and a
          growing set of scheduled workflows.
        </P>

        <H2>The architecture is a gateway, not a bot</H2>
        <P>
          The cleanest idea in OpenClaw is that the assistant is not model-first
          and not channel-first. It is gateway-first.
        </P>
        <P>
          On the VM, the gateway listens on port <Code>18789</Code>. That one
          process serves the browser UI, the WebSocket control plane, health and
          readiness endpoints, session state, scheduled jobs, and the connected
          chat channel. Instead of having a separate backend for the web UI,
          another daemon for automation, and yet another adapter for messaging,
          everything routes through the same long-lived process.
        </P>
        <Pre>{`Telegram
   │
   ▼
OpenClaw Gateway :18789
   │
   ├─ sessions
   ├─ tools
   ├─ cron
   ├─ memory
   ├─ health
   └─ browser UI / WebSocket clients`}</Pre>
        <P>
          That matters because assistants stop being interesting when every
          feature becomes its own sidecar. I wanted one place where state lives
          and one place where routing decisions happen. The live instance
          reflects that design very directly: the gateway is the boundary, and
          almost everything meaningful sits behind it.
        </P>
        <P>
          The current production config is also instructive in what it does{" "}
          <Em>not</Em> do. Only Telegram is enabled right now. The gateway is not
          pretending to be a universal inbox in daily use; it is a focused
          personal system that happens to have been built on top of a more
          general channel-and-tool architecture.
        </P>

        <H2>The state model is the real product</H2>
        <P>
          The most important directory in the whole deployment is{" "}
          <Code>~/.openclaw</Code>. That is where the assistant really lives.
        </P>
        <P>
          On the VM it contains config, credentials, devices, cron state, logs,
          agent workspaces, tasks, memory indexes, delivery queues, and session
          transcripts. The container is almost disposable. The state directory is
          not.
        </P>
        <Table
          head={["path", "what it stores"]}
          rows={[
            ["~/.openclaw/openclaw.json", "live gateway, model, channel, and agent config"],
            ["~/.openclaw/agents/", "agent personas and session history"],
            ["~/.openclaw/memory/", "SQLite-backed memory stores"],
            ["~/.openclaw/cron/", "scheduled jobs and run history"],
            ["~/.openclaw/tasks/", "task execution records"],
            ["~/.openclaw/logs/", "config health and audit logs"],
            ["~/.openclaw/workspace/", "assistant workspace, notes, scripts, and memory files"],
          ]}
        />
        <P>
          That layout reveals something I like architecturally: OpenClaw is
          file-first. The running process is important, but the assistant is
          mostly represented as inspectable state. That makes it easier to back
          up, easier to migrate, and much easier to debug than a system where
          half the truth lives in undocumented runtime memory.
        </P>
        <Callout label="Why this design aged well">
          If I want to understand what the assistant knows, what it has been
          doing, or why something failed, I do not need a proprietary control
          plane. I can inspect the live state on disk. That is a very old-school
          systems property, and I trust it more than most AI tooling abstractions.
        </Callout>

        <H2>Memory is not magical — and that is why it works</H2>
        <P>
          The live instance uses Gemini-backed semantic memory search, but the
          part I trust most is more boring than that. Memory is grounded in the
          workspace and persisted indexes, not in vague promises about what the
          model will remember next turn.
        </P>
        <P>
          The VM has separate memory databases under <Code>~/.openclaw/memory</Code>
          for different personas: <Code>main</Code>, <Code>coder</Code>,{" "}
          <Code>devops</Code>, <Code>lead</Code>, and <Code>security</Code>. The
          main agent is the one actually carrying current usage, but the shape of
          the system is already there: different roles, different memory stores,
          one shared gateway.
        </P>
        <P>
          I like that split because it matches how I actually use assistants. I
          do not want one undifferentiated blob of context. I want a general
          assistant, but I also want separate working modes with different
          responsibilities. The deployment shows that idea very clearly even if,
          right now, the main persona is where the real activity is.
        </P>
        <P>
          There is another practical benefit here: persistent memory can be
          backed up like any other state. The host runs a nightly cron job that
          syncs the whole <Code>~/.openclaw</Code> tree to a GCS bucket. That is
          a much more useful memory story than &ldquo;the agent is stateful&rdquo; in the
          abstract.
        </P>

        <H2>How it is actually deployed</H2>
        <P>
          The production deployment is straightforward in the best possible way.
          OpenClaw runs in Docker on a Debian GCP VM. Docker Compose defines the
          gateway container. Docker restart policy keeps it alive. The host bind
          mounts the persistent state directory into the container.
        </P>
        <Pre>{`services:
  openclaw-gateway:
    build: .
    image: openclaw-gateway-custom:latest
    restart: always
    ports:
      - "18789:18789"
    volumes:
      - /home/<user>/.openclaw:/home/node/.openclaw
      - /home/<user>/.config/gcloud:/home/node/.config/gcloud
    entrypoint: ["/home/node/.openclaw/entrypoint.sh"]
    command: ["node", "openclaw.mjs", "gateway", "--allow-unconfigured"]`}</Pre>
        <P>
          The running container was created in early May and, at the time I
          inspected it, had been up for more than two weeks continuously. The
          image is a custom derivative of the upstream OpenClaw image. It adds a
          few things the workflows need on the server: GitHub CLI, Python, some
          data-pipeline libraries, and Codex CLI.
        </P>
        <P>
          There is a small but telling detail in the custom entrypoint: it
          symlinks Codex state into the mounted OpenClaw state directory so auth
          and runtime state survive container recreation. That is the kind of
          production adaptation I like. It is not flashy, but it is exactly how
          tools stop feeling ephemeral.
        </P>

        <H2>How it is exposed</H2>
        <P>
          There is no nginx or caddy in front of the live system. Docker
          publishes port <Code>18789</Code> directly on all interfaces, and the
          gateway itself enforces token authentication.
        </P>
        <P>
          That means the gateway is doing triple duty: application server,
          control plane, and security boundary. The live config has{" "}
          <Code>gateway.bind = &quot;lan&quot;</Code> and <Code>gateway.auth.mode = &quot;token&quot;</Code>
          , which is the right combination for this setup, but it is still a
          deliberate tradeoff. Simplicity won over layering.
        </P>
        <P>
          Tailscale is also installed and running on the host, which gives me a
          private remote-access path when I want one. So the system has two real
          access patterns: direct gateway access with token auth, and private
          network access through Tailscale. That combination makes sense for a
          personal tool that I still want to reach from multiple places.
        </P>
        <P>
          The health model is intentionally simple. The gateway serves{" "}
          <Code>/healthz</Code> and <Code>/readyz</Code>, both live on the same
          port as the UI. At the moment I inspected it, both were returning 200
          and Docker marked the container healthy.
        </P>

        <H2>Cron is where this stopped being a toy</H2>
        <P>
          The strongest evidence that OpenClaw is a real working system is its
          scheduler.
        </P>
        <P>
          The live instance has 13 internal cron jobs stored under{" "}
          <Code>~/.openclaw/cron</Code>. They cover reminders, summaries,
          health-checking, token refresh, finance ingestion, memory distillation,
          calendar briefings, a daily session log, and a job monitor. Most run
          as isolated agent turns rather than as main-session nudges, which is
          exactly the right choice for noisy automation.
        </P>
        <Table
          head={["job", "schedule", "delivery"]}
          rows={[
            ["Morning tech news summary", "08:30 daily", "announce"],
            ["Calendar pre-event prep briefing", "07:00 daily", "none"],
            ["Calendar post-event debrief prompt + CRM capture", "20:30 daily", "none"],
            ["Refresh Google Calendar token", "every 50 minutes", "none"],
            ["Daily food diary prompt", "20:00 daily", "announce:last"],
            ["Daily IBKR portfolio fetch", "18:00 weekdays", "announce:last"],
            ["Weekly memory distillation", "09:00 Mondays", "announce:last"],
            ["Water the plants reminder", "09:00 Wed/Sat", "announce"],
          ]}
        />
        <P>
          That list says more about the project than any architecture diagram
          could. OpenClaw is not just answering messages. It is managing a
          recurring personal workflow: calendar hygiene, finance chores, health
          checks, journaling, reminders, and maintenance.
        </P>
        <P>
          There are also two host-level cron jobs outside the gateway itself. One
          backs up the whole state directory to Google Cloud Storage at 02:00
          every night. The other runs a weekly Telegram session-trimming script
          to prevent duplicate-message issues. I am especially fond of that
          second one because it is so operationally honest. Real systems accrete
          janitor scripts.
        </P>

        <H2>The failures are as informative as the successes</H2>
        <P>
          One reason I wanted to inspect the live task database is that a health
          endpoint only tells you whether the process is breathing. It does not
          tell you whether the assistant is actually doing useful work.
        </P>
        <P>
          In the last week, the task database recorded about 350 scheduled task
          executions. A large share of those were retries for the Google Calendar
          token refresh job, and many of them failed. Several announce-style jobs
          also failed because delivery routing was not cleanly resolved. In other
          words: the system is very much alive, but parts of the automation layer
          are brittle.
        </P>
        <Pre>{`Last 7 days of task runs
- Refresh Google Calendar token: 303 runs, many failures
- Morning tech news summary: 7 failures
- Daily session log: 7 failures
- Daily food diary prompt: 7 failures
- Calendar pre-event prep briefing: mixed success/failure
- Calendar post-event debrief prompt + CRM capture: mixed success/failure`}</Pre>
        <P>
          I like that I can say that plainly. This is exactly the sort of thing
          I want from a personal assistant write-up: not &ldquo;it has cron,&rdquo; but &ldquo;the
          cron layer surfaces real reliability problems once you actually depend
          on it.&rdquo;
        </P>
        <Callout label="The operational lesson">
          Uptime is not the same thing as usefulness. The container was healthy.
          The gateway was up. But the task history was a better indicator of real
          system quality, because it showed where auth refresh and delivery flows
          were still weak.
        </Callout>

        <H2>The current shape of the assistant</H2>
        <P>
          The live config currently defines five agent personas:{" "}
          <Code>main</Code>, <Code>lead</Code>, <Code>coder</Code>,{" "}
          <Code>security</Code>, and <Code>devops</Code>. All of them default to
          the same primary model family right now, with fallbacks configured
          across providers, but only the main agent is showing meaningful
          day-to-day activity.
        </P>
        <P>
          That tells me something useful about the maturity of the system.
          OpenClaw has already crossed the line from &ldquo;one chat session&rdquo; to
          &ldquo;assistant platform with roles,&rdquo; but the operational centre of gravity
          is still a single personal mainline. That feels right. I would much
          rather grow a working personal system outward than invent a multi-agent
          architecture before I need it.
        </P>
        <P>
          It also explains why the project later influenced work I did
          professionally. Once you have a live gateway that owns state, tools,
          retries, personas, and scheduling, you stop thinking of an assistant as
          a prompt and start thinking of it as a runtime.
        </P>

        <H2>What I would change</H2>
        <P>
          The first thing I would change is reliability instrumentation. The
          system already records task runs, and that is good, but the live
          deployment would benefit from much clearer job-level success signals
          and failure summaries. Right now I can inspect the truth, but I still
          have to go looking for it.
        </P>
        <P>
          The second is ingress discipline. Publishing the gateway directly keeps
          the deployment wonderfully small, but it also concentrates a lot of
          responsibility in one process. I still like the simplicity, but I would
          probably want a more explicit edge story if I pushed this further.
        </P>
        <P>
          Third, I would make the separation between &ldquo;platform state&rdquo; and
          &ldquo;personal workspace state&rdquo; cleaner. <Code>~/.openclaw</Code> is a very
          effective home for everything, but it is also where years of habits,
          experiments, and production concerns pile up together. It is manageable
          because it is mine. It would be less pleasant as a generic product
          boundary.
        </P>
        <P>
          And finally, I would keep writing about the live system rather than the
          abstract one. The deployed OpenClaw is narrower, messier, and more
          interesting than the broader clone on disk. That is a good reminder
          that software is most truthfully described where it actually runs.
        </P>

        <H2>The stack</H2>
        <UL>
          <LI>
            <Em>Host:</Em> Debian VM on GCP, with Docker and Tailscale.
          </LI>
          <LI>
            <Em>Runtime:</Em> OpenClaw 2026.4.14, Node 24 inside the container.
          </LI>
          <LI>
            <Em>Deployment:</Em> Docker Compose, one gateway container, restart
            policy <Code>always</Code>, direct port publication on 18789.
          </LI>
          <LI>
            <Em>State:</Em> Persistent bind-mounted <Code>~/.openclaw</Code>{" "}
            directory with config, sessions, memory, cron, tasks, and logs.
          </LI>
          <LI>
            <Em>Channel in current use:</Em> Telegram with pairing / allowlist
            policy.
          </LI>
          <LI>
            <Em>Automation:</Em> 13 internal cron jobs plus host cron for backup
            and maintenance.
          </LI>
          <LI>
            <Em>Memory:</Em> Persistent per-agent memory stores with Gemini-based
            semantic search configured on the live system.
          </LI>
        </UL>
        <P>
          OpenClaw matters to me because it graduated from &ldquo;assistant idea&rdquo; to
          &ldquo;assistant I have to operate.&rdquo; That is where the real engineering
          starts. The repo still matters, but the VM is where the project became
          honest: a gateway, a state directory, a scheduler, a chat surface, a
          backup job, a maintenance script, and a long list of small tradeoffs
          that together make the thing useful.
        </P>
      </article>
    </main>
  );
}
