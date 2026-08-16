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
  title: "A security scanner that files its own pull requests — Yves De Boeck",
  description:
    "How I built an Azure DevOps task that detects the stack, runs multiple security scanners, triages findings with an LLM, and opens fix PRs with guardrails.",
  openGraph: {
    title: "A security scanner that files its own pull requests",
    description:
      "An Azure DevOps task that combines scanner orchestration, LLM triage, and controlled auto-remediation.",
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
          Security engineering · 14 min read
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.1] mb-6">
          A security scanner that files its own pull requests
        </h1>
        <p className="text-lg text-slate-400 leading-relaxed mb-16">
          I built an Azure DevOps task for a large industrial company that does
          more than fail a pipeline. It detects the stack, runs several scanners,
          asks an LLM to triage the noise, and can open a remediation PR instead
          of leaving developers with a screenshot and a headache.
        </p>

        <P>
          The core idea was simple: a security pipeline should not stop at
          classification. Most teams already have scanners. What they lack is the
          layer between raw findings and an actionable change set. So I built a
          task that wraps multiple tools, normalises their output, enriches it
          with an LLM pass, and then uses automation very selectively:
          dependency bumps where the fix is mechanical, targeted configuration
          edits where a validator can prove the result is still syntactically
          sound, and a pull request for a human to review before anything reaches
          production.
        </P>
        <P>
          The interesting part was not making one scanner work. It was deciding
          where automation should stop. A system that can edit infrastructure or
          dependency manifests in your CI environment is only useful if it is
          boringly constrained. Most of the architecture is really about those
          constraints.
        </P>

        <H2>The shape of the system</H2>
        <P>
          The packaged deliverable is an <Em>Azure DevOps task extension</Em>,
          but the real engine is a Python package inside it. The task entry point
          is a small TypeScript wrapper that runs on the build agent, installs
          the bundled Python dependencies, installs scanner CLIs if needed, and
          then shells into the Python CLI.
        </P>
        <Pre>{`- task: AiaSecurityScan@0
  inputs:
    azureOpenAIEndpoint: $(AZURE_OPENAI_ENDPOINT)
    azureOpenAIDeployment: gpt-4o
    failOnSeverity: high
    autoFixPR: true
    imageTag: ""
    skipTriage: false`}</Pre>
        <P>
          That split turned out to be useful. The Azure DevOps integration stays
          small and versionable as a VSIX, while the Python layer owns the parts
          that actually change quickly: stack detection, scanner adapters,
          suppression logic, triage, reporting, and remediation.
        </P>

        <Table
          head={["layer", "responsibility", "why it lives there"]}
          rows={[
            [
              "TypeScript task",
              "Collect task inputs, install tools, invoke CLI",
              "Fits Azure DevOps task model cleanly",
            ],
            [
              "Python core",
              "Detection, scanning, triage, reports, PR logic",
              "Faster to evolve than task packaging",
            ],
            [
              "Azure OpenAI",
              "Structured triage and targeted fixes",
              "Adds judgment where scanners are noisy",
            ],
            [
              "Azure DevOps REST API",
              "Create remediation PRs",
              "Keeps review in the existing workflow",
            ],
          ]}
        />

        <H2>What it actually scans</H2>
        <P>
          The repo detector looks for familiar marker files —{" "}
          <Code>pyproject.toml</Code>, <Code>requirements.txt</Code>,{" "}
          <Code>package.json</Code>, <Code>Dockerfile</Code>,{" "}
          <Code>*.bicep</Code>, <Code>*.tf</Code>, and a few others — and builds
          a simple stack list from that. The scanner orchestration is
          deliberately less ambitious than the detector.
        </P>
        <Table
          head={["scanner", "when it runs", "what it contributes"]}
          rows={[
            [
              "pip-audit",
              "Python requirements-based projects",
              "Dependency CVEs and fixable version bumps",
            ],
            [
              "TruffleHog",
              "Always",
              "Secret detection across the repository",
            ],
            [
              "Trivy",
              "Docker repos or explicit image tag",
              "Container and filesystem vulnerabilities",
            ],
            [
              "Checkov",
              "Bicep or Terraform present",
              "IaC and Dockerfile policy findings",
            ],
          ]}
        />
        <P>
          One detail I like because it is honest: the detector already
          recognises Node, .NET and C++, but the current scanner wiring is still
          strongest on Python, containers and IaC. That is better than
          pretending the coverage is broader than it is. The architecture is
          ready to expand; the shipped scanner set is narrower.
        </P>
        <Callout label="Important nuance">
          Auto-detecting a stack and meaningfully securing that stack are not
          the same thing. The code already spots more ecosystems than it
          currently drives to a dedicated scanner path. I would much rather
          surface that gap explicitly than market the task as more complete than
          it is.
        </Callout>

        <H2>Normalising scanner output into one model</H2>
        <P>
          The core package maps every tool into the same internal{" "}
          <Code>Finding</Code> shape: scanner, ID, title, description, severity,
          affected target, fix version, references, and a few LLM-enriched
          fields. That sounds unglamorous, but it is the reason the rest of the
          system works. Without a shared model, you cannot sort findings by
          severity across tools, generate one report, or feed the whole batch
          into a single triage pass.
        </P>
        <Pre>{`Finding(
  scanner="trivy",
  id="CVE-2026-xxxx",
  severity="high",
  affected="package@1.2.3",
  fix_version="1.2.4",
  auto_fixable=true
)`}</Pre>
        <P>
          The task also supports a repository-level suppression file. If a team
          has a known false positive or a risk they have consciously accepted,
          they can declare that in <Code>.aia-security-scan.toml</Code> instead
          of playing whack-a-mole in every pipeline run. Suppressed findings
          still show up in reports; they just stop driving the fail gate.
        </P>

        <H2>Where the LLM adds value</H2>
        <P>
          I did not use the model as a replacement for scanners. I used it as
          the layer that scanners are bad at: context-sensitive triage. The task
          sends the consolidated findings to Azure OpenAI with a strict JSON
          schema and asks for six things per finding: corrected severity,
          exploitability, recommended action, suggested fix, whether it is
          auto-fixable, and whether it looks like a suppressible false positive.
        </P>
        <Pre>{`{
  "id": "CVE-2026-xxxx",
  "severity": "high",
  "exploitability": "likely",
  "recommended_action": "Upgrade to the patched version",
  "suggested_fix": "Pin package >= 1.2.4",
  "auto_fixable": true,
  "suppress_reason": null
}`}</Pre>
        <P>
          Two implementation choices matter here. First, the call runs at{" "}
          <Code>temperature=0</Code> with structured output rather than free-form
          prose. I wanted consistent fields, not eloquence. Second,
          authentication can use an API key or fall back to managed identity via{" "}
          <Code>DefaultAzureCredential</Code>, which makes the task viable in
          locked-down enterprise environments without baking secrets into the
          extension.
        </P>
        <P>
          This is also where most of the false-positive reduction happens. A
          secret detector can only say “this string resembles a secret”. A
          triage pass can say “this is an obvious test fixture” or “this one
          deserves escalation immediately”. The model is not treated as ground
          truth, but it is useful as a second-stage filter on top of
          deterministic scanners.
        </P>

        <H2>The remediation paths are intentionally uneven</H2>
        <P>
          I did <Em>not</Em> build one universal auto-fixer. There are two very
          different remediation modes because the risk profile is different.
        </P>

        <H3>1. Dependency bumps</H3>
        <P>
          For Python dependency findings, the task takes the boring route on
          purpose. If <Code>pip-audit</Code> already knows the safe version, the
          system runs <Code>pip-audit --fix</Code>. For some Trivy-reported
          Python findings, it can patch <Code>pyproject.toml</Code> or{" "}
          <Code>requirements*.txt</Code> directly to raise the minimum version.
          That is a mechanical change, so the automation budget can be higher.
        </P>

        <H3>2. IaC and Dockerfile fixes</H3>
        <P>
          This is where the genuinely agentic part starts. The newer core
          package includes a fixer loop built on Microsoft Agent Framework. For
          each eligible finding it exposes three tools to the model:{" "}
          <Code>read_file</Code>, <Code>write_file</Code>, and{" "}
          <Code>run_validation</Code>. The model has to read the target file,
          write back a complete replacement, and then prove the result passes a
          validator.
        </P>
        <Pre>{`read_file(path)
write_file(path, full_updated_content, explanation)
run_validation(path) -> ok | error`}</Pre>
        <P>
          Validation is language-aware. Bicep goes through{" "}
          <Code>az bicep build</Code>, Dockerfiles use <Code>hadolint</Code>{" "}
          when available, Python uses <Code>py_compile</Code>, and JSON/YAML are
          parsed structurally. If validation fails, the change is rolled back. If
          the model never produces a valid edit, the finding is skipped and left
          for a person.
        </P>

        <H2>How the loop knows when to stop</H2>
        <P>
          This is the part I cared about most. The fix loop is not allowed to
          wander. It is bounded in four different ways.
        </P>
        <UL>
          <LI>
            It only attempts fixes for a narrow scanner set — currently Checkov
            findings in the agentic path.
          </LI>
          <LI>
            The tool surface is tiny: read one file, overwrite one file,
            validate one file.
          </LI>
          <LI>
            <Code>write_file</Code> and <Code>run_validation</Code> have capped
            invocation counts, so a bad prompt cannot spin forever.
          </LI>
          <LI>
            Every file path is resolved against the repository root and rejected
            if it escapes that boundary.
          </LI>
        </UL>
        <P>
          That last point matters more than it sounds. Once you let an agent
          write to disk in CI, path safety is not an implementation detail. The
          code explicitly strips line-number suffixes from findings, resolves
          absolute paths, and rejects anything outside the checked-out
          repository.
        </P>
        <Callout label="The guardrail I would not remove">
          The agent never merges. It only proposes. The task can push a branch
          and open a PR, but the final trust boundary is still code review. That
          keeps the system useful without pretending an LLM should have commit
          authority over production infrastructure.
        </Callout>

        <H2>What happens after a fix</H2>
        <P>
          When a fix is applied, the task creates a branch named from the build
          ID, commits the changes with a bot identity, pushes the branch, waits
          until Azure DevOps can see it, and then creates a pull request through
          the REST API. The PR description includes what was changed, which
          findings were addressed, and which findings were deliberately skipped
          for manual review.
        </P>
        <Pre>{`security/auto-fix-{BUILD_BUILDID}

git add -A
git commit -m "fix: auto-fix security vulnerabilities"
git push --set-upstream origin security/auto-fix-{BUILD_BUILDID}`}</Pre>
        <P>
          One design choice I like is that the PR targets the branch that
          triggered the build, not always <Code>main</Code>. That keeps the
          remediation inside the developer&apos;s current workflow instead of
          teleporting changes into a different integration branch.
        </P>

        <H2>What the Azure DevOps task exposes</H2>
        <P>
          The packaged task surface is intentionally small: endpoint,
          deployment, optional API key and API version, failure threshold,
          optional image tag, a flag to skip triage, and a flag to auto-create a
          dependency-fix PR. Reports land in the artifact staging directory as
          JSON and Markdown, and findings are also emitted as Azure DevOps log
          annotations so the failure is visible directly in the pipeline UI.
        </P>
        <P>
          There is one honest mismatch between the core engine and the packaged
          task: the Python CLI already contains a richer{" "}
          <Code>--auto-fix-iac</Code> path, but the task definition I inspected
          does not expose that flag yet. In other words, the architecture has
          advanced faster than the extension surface. That is normal for internal
          platform tooling, but it is worth saying out loud.
        </P>

        <H2>The tradeoffs are the whole point</H2>
        <P>
          The easy story would be “we used AI to fix security findings”. The
          real story is about tradeoffs.
        </P>
        <UL>
          <LI>
            <Em>Cost:</Em> repeated LLM calls are expensive compared with running
            one more scanner binary, so the model is used after aggregation, not
            before.
          </LI>
          <LI>
            <Em>Safety:</Em> dependency bumps are cheap to validate; arbitrary
            code changes are not, so the auto-fix scope stays narrow.
          </LI>
          <LI>
            <Em>Noise:</Em> scanners are deterministic but chatty; the triage
            pass reduces noise, but it also introduces a probabilistic component
            that has to be constrained with schema, temperature, and review.
          </LI>
          <LI>
            <Em>Coverage:</Em> the task detects more ecosystems than it deeply
            remediates today, which is acceptable as long as that gap is visible.
          </LI>
        </UL>
        <P>
          I think this is the right place for agentic automation in security
          engineering: not as an oracle, and not as a fully autonomous merger,
          but as a remediation accelerator sitting behind deterministic scanners
          and in front of human approval.
        </P>

        <H2>What I would change next</H2>
        <P>
          The first upgrade is obvious: after a successful fix, I would rerun
          the relevant scanners before opening the PR. The current loop validates
          file syntax and structure, which is necessary, but it is not the same
          thing as proving the original finding is gone. The end-to-end “fix
          until clean” story is only half true until that rescan is wired in.
        </P>
        <P>
          The second upgrade is broader scanner coverage. The detector already
          knows about Node and .NET, but that should turn into first-class
          scanner paths instead of a future intention. The third is stronger
          policy around what the agent may edit — for example only dependency
          manifests, Dockerfiles and explicitly allowlisted IaC directories —
          because successful automation tends to earn more trust than it should.
        </P>
        <P>
          But even in its current form, the task proved the thing I cared about:
          a pipeline can do more than shout. It can classify, explain, propose,
          and hand a reviewer a concrete patch instead of a red badge.
        </P>

        <H2>The stack</H2>
        <UL>
          <LI>
            <Em>Packaging:</Em> Azure DevOps VSIX extension with a Node 20 task
            entry point.
          </LI>
          <LI>
            <Em>Core:</Em> Python CLI and shared finding model.
          </LI>
          <LI>
            <Em>Scanners:</Em> pip-audit, Trivy, TruffleHog, Checkov.
          </LI>
          <LI>
            <Em>Triage:</Em> Azure OpenAI with structured JSON output.
          </LI>
          <LI>
            <Em>Agentic remediation:</Em> Microsoft Agent Framework plus
            validator-backed file edits.
          </LI>
          <LI>
            <Em>Integration:</Em> Azure DevOps pipeline annotations, artifacts,
            branch creation and PR automation.
          </LI>
        </UL>
      </article>
    </main>
  );
}
