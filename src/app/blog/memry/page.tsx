import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Callout,
  Code,
  Em,
  H2,
  P,
  Pre,
  Table,
  UL,
  LI,
} from "@/components/blog/Prose";

export const metadata: Metadata = {
  title: "Memry - Yves De Boeck",
  description:
    "How I built Memry: a PDF-to-study-material pipeline with FastAPI, Gemini, OpenAI, SM-2 review scheduling, and a web/mobile product on GCP.",
  openGraph: {
    title: "Memry",
    description:
      "How I built an AI study pipeline for PDFs, EPUBs, and spaced repetition.",
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
          AI engineering · 11 min read
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.1] mb-6">
          Memry: turning books into study material, with all the messy bits left
          in
        </h1>
        <p className="text-lg text-slate-400 leading-relaxed mb-16">
          Memry takes a PDF or EPUB, extracts structure, generates summaries and
          flashcards, then schedules review with spaced repetition. The idea is
          simple. The implementation is not.
        </p>

        <P>
          Memry is one of those projects where the product pitch sounds cleaner
          than the code reality: upload a document, let AI turn it into something
          you can actually study, then review it on web or mobile until it sticks.
          Underneath that, though, there are several different problems hiding in
          one UX: file parsing, structure inference, prompt discipline, cost
          control, stateful review scheduling, and deployment that does not turn
          into a weekend job every time a secret rotates.
        </P>
        <P>
          The repo is split into three real applications. The backend lives in{" "}
          <Code>code/</Code> as a FastAPI app with SQLAlchemy and Alembic. The web
          frontend is a React app in <Code>frontend/</Code>. The mobile client is
          an Expo app in <Code>mobile/</Code>. Infrastructure is in Terraform
          under <Code>infra/gcp</Code>, and deployment is wired through GitHub
          Actions with Workload Identity Federation rather than long-lived cloud
          keys.
        </P>

        <H2>What the ingestion pipeline actually does</H2>
        <P>
          Memry supports three input modes, and they are not equally reliable:
          PDFs, EPUBs, and a slightly wild &ldquo;book by name&rdquo; flow where the
          model generates study material from its training knowledge without any
          uploaded file.
        </P>
        <P>
          For PDFs, the backend uses <Code>PyPDF2.PdfReader</Code> and simply
          walks every page with <Code>page.extract_text()</Code>. There is no OCR,
          no layout reconstruction, and no attempt to preserve tables, footnotes,
          or multi-column flow:
        </P>
        <Pre>{`pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_content))
text = ""
for page in pdf_reader.pages:
    text += page.extract_text() + "\n"`}</Pre>
        <P>
          That keeps the pipeline simple and cheap, but it also defines its
          ceiling. If the source PDF is image-based, badly tagged, or visually
          complex, the whole downstream AI layer starts from degraded text.
        </P>
        <P>
          EPUB is the stronger path. <Code>ebooklib</Code> reads the file,
          BeautifulSoup strips HTML, and the service tries to recover structure
          from the table of contents before falling back to headings or filenames.
          In other words: EPUB processing has real chapter boundaries; PDF
          processing mostly asks the model to infer them.
        </P>
        <Callout label="The biggest architectural asymmetry">
          PDF and EPUB are not symmetrical inputs in Memry. EPUB chapters are
          grounded in the source file. PDF chapters are reconstructed after plain
          text extraction. That means the same book can produce meaningfully
          better flashcards as EPUB than as PDF, even before model choice enters
          the picture.
        </Callout>

        <H2>How the AI generation is wired</H2>
        <P>
          The LLM layer is pluggable through <Code>LLM_TYPE</Code>. In practice,
          the main providers implemented are OpenAI and Google Gemini, with a
          mock service used in tests and low-cost CI runs. The defaults in the
          repo are telling: local config and Terraform both lean toward Gemini,
          specifically <Code>gemini-2.5-flash</Code>, which is a good fit for
          long inputs and lower cost.
        </P>
        <P>
          The processing flow is four-stage. First Memry extracts structure.
          Then it creates chapter records. Then it fans out concurrent LLM calls
          per chapter to generate a summary, key insights, and 5–10 Q&amp;A cards.
          Finally it synthesizes book-level summary and key insights from the
          chapter outputs.
        </P>
        <P>
          Concurrency is explicitly capped with <Code>LLM_MAX_CONCURRENCY</Code>,
          defaulting to 5. That is a small but important cost-control detail:
          without it, a large book could explode into dozens of simultaneous model
          calls.
        </P>
        <Pre>{`semaphore = asyncio.Semaphore(settings.llm_max_concurrency)

results = await asyncio.gather(
    generate_summary(...),
    generate_key_insights(...),
    generate_qa_cards(...),
)`}</Pre>
        <P>
          OpenAI and Gemini do not get the exact same treatment. Gemini uses a
          long-context path and hard-truncates structure extraction input at{" "}
          <Code>LLM_MAX_INPUT_CHARS</Code> - 800,000 characters by default.
          OpenAI switches to chunked processing above{" "}
          <Code>OPENAI_MAX_INPUT_CHARS</Code>, analyzes chunks in parallel, then
          asks the model to combine them back into one JSON structure.
        </P>
        <P>
          That chunking is only used for <Em>structure extraction</Em>. The later
          summary and flashcard prompts are much tighter than they first appear:
          both <Code>build_summary_prompt()</Code> and{" "}
          <Code>build_qa_cards_prompt()</Code> only send the first 3,000
          characters of a chapter.
        </P>
        <Pre>{`body = content[:3000]

"Create 5-10 Q&A cards from the following content..."`}</Pre>
        <P>
          That is a very real tradeoff. It keeps prompts bounded and cost
          predictable, but it also means long chapters are summarized from a
          preview, not from the full text. Memry is not pretending to do full-book
          semantic coverage per chapter; it is deliberately clipping the input.
        </P>

        <H2>The subtle lossy-compression bug in the PDF path</H2>
        <P>
          The most interesting thing I found is not a crash. It is a quality
          issue baked into the architecture.
        </P>
        <P>
          The structure-extraction prompt for PDFs asks the model to return JSON
          with <Code>summary</Code> and <Code>q_and_a</Code> per chapter. But
          later, when <Code>_process_pdf()</Code> creates chapter records, it uses
          this fallback:
        </P>
        <Pre>{`content = chapter_data.get("content", chapter_data.get("summary", ""))`}</Pre>
        <P>
          That means if the first model pass does not return raw chapter content -
          and the prompt does not require it - the second wave of summary and
          flashcard generation runs on the model&apos;s own summary of the chapter,
          not on the extracted PDF text. In effect, the PDF pipeline can become a
          two-step lossy compression: raw text → model summary → more summaries and
          cards.
        </P>
        <P>
          EPUB avoids most of this because the chapter content is real source
          text. PDF does not. If I were debugging flashcard quality complaints,
          this is the first place I would look.
        </P>

        <H2>Prompts, parsing, and keeping model output barely civilised</H2>
        <P>
          The prompts are straightforward but disciplined. Memry separates system
          instructions for structure, summaries, key insights, chapter titles, and
          Q&amp;A cards. JSON-returning prompts are backed by a small parsing layer
          in <Code>llm_parsing.py</Code> that strips markdown fences, tries loose
          JSON recovery, and normalises missing fields like flashcard difficulty.
        </P>
        <P>
          I like this part because it is pragmatic. The code does not assume the
          model will behave. It actively cleans up after it.
        </P>
        <P>
          There is also an optional MLflow tracing hook, which is exactly the kind
          of thing I want in an AI-heavy backend: not because tracing is trendy,
          but because prompt cost and failure rates are otherwise invisible until
          users complain.
        </P>

        <H2>Spaced repetition is real SM-2, not &ldquo;AI review&rdquo; branding</H2>
        <P>
          Memry&apos;s review scheduler is refreshingly normal. The app stores user
          progress in <Code>user_cards</Code> and implements the classic SM-2
          algorithm: quality below 3 resets the card, the first successful
          repetitions schedule at 1 day and 6 days, and later intervals multiply
          by ease factor.
        </P>
        <Pre>{`if quality < 3:
    user_card.repetitions = 0
    user_card.interval_days = 1
elif user_card.repetitions == 0:
    user_card.interval_days = 1
elif user_card.repetitions == 1:
    user_card.interval_days = 6
else:
    user_card.interval_days *= user_card.ease_factor`}</Pre>
        <P>
          That matters because it keeps the learning loop inspectable. The AI
          creates the material; the review cadence is deterministic. I would trust
          that split far more than an opaque &ldquo;adaptive AI memory engine&rdquo;
          claim.
        </P>
        <Table
          head={["model", "role"]}
          rows={[
            ["books", "uploaded file or title-only source record"],
            ["book_chapters", "ordered chapter structure and chapter text"],
            ["book_summaries", "chapter-level and full-document summaries"],
            ["book_cards", "generated flashcards with difficulty and tags"],
            ["user_cards", "SM-2 state: repetitions, ease factor, next review"],
          ]}
        />

        <H2>Auth, notifications, and web/mobile parity</H2>
        <P>
          Authentication is intentionally simple: email/password login, JWT bearer
          tokens, and password hashing with <Code>pbkdf2_sha256</Code>. There are
          no refresh tokens, social logins, or identity-provider abstractions. For
          a personal product, that is a sensible scope choice.
        </P>
        <P>
          Notifications are more ambitious. The backend has a pluggable
          notification layer with mock, email, in-app, and push implementations.
          Push uses Firebase Cloud Messaging HTTP v1, and both clients register
          tokens against the backend. Cloud Scheduler can hit a protected daily
          review endpoint on Cloud Run using OIDC, and the notification service
          batches due-card reminders while respecting per-user daily limits.
        </P>
        <P>
          The web and mobile apps are closer than I expected. Both support upload,
          title-only generation, review, and notification registration. The mobile
          client is not just a wrapper; it has dedicated review and study flows in
          Expo Router. That said, the web UI is still richer in inspection:
          chapter navigation, difficulty filtering, and denser detail views are
          better developed there.
        </P>

        <H2>Deployment is serious, even if a few seams still show</H2>
        <P>
          Memry is deployed on GCP with more infrastructure discipline than most
          side projects get. Terraform provisions Cloud Run, Cloud SQL Postgres,
          Cloud Storage, Secret Manager, Artifact Registry, Cloud Scheduler, and
          monitoring hooks. GitHub Actions authenticates through Workload Identity
          Federation, which avoids baking service-account keys into CI.
        </P>
        <UL>
          <LI>
            <Em>Backend:</Em> FastAPI on Cloud Run, talking to Cloud SQL over the
            Cloud SQL connector.
          </LI>
          <LI>
            <Em>Storage:</Em> GCS in production, Azure/Azurite supported for local
            development.
          </LI>
          <LI>
            <Em>Secrets:</Em> JWT, database URL, and model API keys in Secret
            Manager.
          </LI>
          <LI>
            <Em>CI:</Em> Postgres service container, Ruff, Black, pytest, and mock
            LLMs to keep tests deterministic and cheap.
          </LI>
        </UL>
        <P>
          I also found the kind of deployment drift that only appears after a
          project has lived for a while. The scheduler Terraform says daily at 9
          AM UTC, while the deployment script still prints that dev runs every 5
          minutes. There is also a hand-managed Cloud Run deploy script alongside
          Terraform-managed service config. None of this is catastrophic, but it
          is exactly how operational truth starts splitting across files.
        </P>
        <Callout label="A gotcha I would fix early">
          Memry already has the beginnings of two deployment systems: Terraform
          defines Cloud Run, but <Code>deploy-code.sh</Code> also pushes config at
          deploy time. That is workable in a solo project, but it is how &ldquo;what
          is production, exactly?&rdquo; becomes an uncomfortable question six months
          later.
        </Callout>

        <H2>What I would change</H2>
        <P>
          First, I would make PDF processing less lossy. The cleanest fix is to
          segment extracted text into actual chapter spans before running chapter
          summaries and Q&amp;A generation, instead of letting later stages inherit
          model-written summaries as source material.
        </P>
        <P>
          Second, I would make the product more explicit about the title-only
          feature. It is clever and useful, but it is also fundamentally different
          from file-grounded generation. A study guide hallucinated from model
          memory should never look indistinguishable from one grounded in an
          uploaded book.
        </P>
        <P>
          Third, I would finish the vocabulary migration from PDFs to books. The
          database and primary API have moved, but there are still legacy routes,
          component names like <Code>PDFDetails</Code>, and response fields like{" "}
          <Code>pdf_title</Code>. That sort of mismatch is survivable, but it makes
          future refactors slower than they need to be.
        </P>
        <P>
          And finally, I would keep the good part exactly as it is: the review
          engine. SM-2 is boring in the best possible way. In a project with lots
          of AI uncertainty, having one core loop that is deterministic, testable,
          and easy to reason about is a real strength.
        </P>
      </article>
    </main>
  );
}
