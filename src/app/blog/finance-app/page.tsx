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
  title: "My finance app starts with a bank statement - Yves De Boeck",
  description:
    "A local-first finance tracker built around PDF and Excel imports, GPT-assisted transaction extraction, and a deliberately simple categorisation loop.",
  openGraph: {
    title: "My finance app starts with a bank statement",
    description:
      "How I built a local-first finance tracker around bank statement imports, category memory, and a very honest set of tradeoffs.",
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
          Personal software · 9 min read
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.1] mb-6">
          My finance app starts with a bank statement
        </h1>
        <p className="text-lg text-slate-400 leading-relaxed mb-16">
          This project is less &ldquo;fintech platform&rdquo; and more a very
          opinionated personal workflow: upload a bank statement, extract the
          rows, fix the ambiguous ones once, and let the app remember the next
          time.
        </p>

        <P>
          I like projects that solve one narrow problem end to end. This one
          started with a simple frustration: bank apps are good at showing raw
          transactions, but bad at helping me build my own categories, my own
          summaries, and my own sense of where money is actually going.
        </P>
        <P>
          The repo in its current form is intentionally scrappy. The backend is
          a single FastAPI app. The frontend is not a React SPA yet; it is two
          static HTML pages served by FastAPI. Persistence is not Postgres or
          Firestore, but CSV and JSON files sitting next to the code. That is
          not an accident. For a personal finance tool, keeping the first
          version local and inspectable was more important to me than making it
          feel enterprise-grade.
        </P>

        <H2>The core problem is ingestion, not charting</H2>
        <P>
          The interesting part of a personal finance app is not drawing a bar
          chart. It is turning messy bank exports into a transaction model I
          control. In this repo I built two ingestion paths.
        </P>

        <H3>Path one: Excel import for structured exports</H3>
        <P>
          When the bank gives me a spreadsheet, the pipeline is deterministic.
          I read the workbook with pandas, map the bank-specific Dutch column
          names into my own schema, and append only genuinely new transactions
          using the bank reference as the primary key.
        </P>
        <Pre>{`df_mapped = pd.DataFrame({
    "transaction_id": df["Referentie"],
    "date": pd.to_datetime(df["Valutadatum"]).dt.strftime("%d-%m-%Y"),
    "recipient": df["Naam tegenpartij"],
    "transaction_type": df["Beschrijving"],
    "amount": df["Bedrag"].astype(float),
    "comment": df["Mededeling"],
})

df_mapped["category"] = df_mapped["recipient"].map(category_mapping)
df_mapped["is_historic"] = 0`}</Pre>
        <P>
          That path is boring in the best way. Once the columns are known, the
          import is predictable and cheap. No model call, no heuristics, no
          ambiguity beyond whether a recipient has been seen before.
        </P>

        <H3>Path two: PDF import for the awkward cases</H3>
        <P>
          PDFs are where the project gets more interesting. I extract raw text
          with <Code>pdfplumber</Code>, then send that text to{" "}
          <Code>gpt-4o</Code> with a detailed prompt describing how to interpret
          each transaction type on the statement: card payments, incoming
          transfers, direct debits, instant payments, credit-card settlement,
          and so on.
        </P>
        <P>
          The model is not deciding my spending categories. It is doing
          document-to-JSON extraction on semi-structured bank statements that
          are annoying to parse with regular expressions alone.
        </P>
        <Callout label="Important distinction">
          The AI step is for <Em>structure extraction</Em>, not for financial
          judgement. Once a PDF has been turned into{" "}
          <Code>transaction_id</Code>, <Code>recipient</Code>,{" "}
          <Code>amount</Code> and friends, categorisation becomes a deterministic
          lookup plus human review. That boundary matters for both accuracy and
          cost control.
        </Callout>

        <H2>Categorisation is memory, not a classifier</H2>
        <P>
          I did not train a model to infer that a merchant belongs to food,
          transport, or hobbies. The categorisation layer is much simpler and,
          for a personal tool, arguably better: a remembered mapping from
          recipient name to category ID.
        </P>
        <P>
          The app keeps two small supporting datasets alongside the transaction
          ledger: <Code>categories.csv</Code>, which defines 62 categories split
          across fixed and variable spending, and{" "}
          <Code>category_mapping.json</Code>, which stores known
          recipient-to-category assignments. When I correct a row and click
          &ldquo;Save &amp; Remember&rdquo;, the backend persists both the
          transaction update and the new mapping.
        </P>
        <Pre>{`df.loc[df["transaction_id"].astype(str) == data.transaction_id, "category"] = data.category

category_mapping[data.recipient] = data.category
save_category_mapping(category_mapping)
save_transactions(df)`}</Pre>
        <P>
          That gives me a nice feedback loop. New merchants land in an
          uncategorised queue. Known merchants get auto-filled immediately.
          Over time the manual workload falls without introducing the opacity of
          a learned classifier.
        </P>
        <P>
          It is also a very personal design. A generic finance app would need
          cross-user generalisation. Mine does not. It only needs to learn{" "}
          <Em>my</Em> recurring landlords, subscriptions, transport operators
          and lunch spots.
        </P>

        <H2>The data model is a flat-file ledger</H2>
        <P>
          There is no database schema in the usual sense. The application state
          lives in a few files on disk, and the main one is a transaction CSV
          with this shape:
        </P>
        <Pre>{`transaction_id,date,recipient,transaction_type,amount,comment,category,is_historic`}</Pre>
        <P>
          That file currently holds a little over 1,300 transactions spanning
          2023 to early 2025. An <Code>is_historic</Code> flag distinguishes
          backfilled history from newer imports, which is a simple but useful
          way to keep curation workflows separate.
        </P>
        <Table
          head={["file", "role", "tradeoff"]}
          rows={[
            [
              <Code key="t">transactions.csv</Code>,
              "Main ledger of imported and manually curated transactions.",
              "Easy to inspect and version, but not great for concurrency or auditing.",
            ],
            [
              <Code key="c">categories.csv</Code>,
              "Category taxonomy with ID, name, type and parent category.",
              "Simple and editable, but data hygiene matters a lot.",
            ],
            [
              <Code key="m">category_mapping.json</Code>,
              "Remembered merchant-to-category mappings.",
              "Very fast feedback loop, but exact-string matching is brittle.",
            ],
          ]}
        />
        <P>
          One detail I like here is that duplicates are handled pragmatically.
          Every import path funnels through a uniqueness check on{" "}
          <Code>transaction_id</Code>. That is enough to make repeated imports
          safe for the bank formats I am using without needing a heavier
          reconciliation system.
        </P>

        <H2>The frontend is an operations screen</H2>
        <P>
          The UI is less a polished product than a transaction triage tool. The
          main page fetches uncategorised rows, shows a counter, lets me edit
          the recipient text, then choose a parent category and subcategory
          before saving. It is deliberately operational: the point is to reduce
          the distance between an imported row and a cleaned ledger.
        </P>
        <P>
          The statistics page is even more revealing. I already had two charting
          paths in the codebase: Matplotlib endpoints for category and daily
          spending, and a separate <Code>stats.html</Code> page that embeds a
          Looker Studio dashboard in an iframe. That tells the story of the
          project pretty well. I started with code-generated plots, but I also
          wanted a hosted BI view that was easier to tweak visually.
        </P>
        <P>
          The repo description calls this a React app on GCP, but the checked-in
          code is honestly more local-first than that. The frontend is plain
          HTML and JavaScript, and the only clearly Google-hosted piece I can
          see is the embedded Looker Studio report rather than a full deployed
          application stack.
        </P>

        <H2>What &ldquo;investment tracking&rdquo; means here</H2>
        <P>
          One thing the repo makes clear is that this is primarily a cashflow
          tracker, not a portfolio accounting engine. There are categories like{" "}
          <Code>investering app</Code> and <Code>aankoop/verkoop</Code>, but I
          could not find a holdings model, price history, ticker master, or any
          mark-to-market logic.
        </P>
        <P>
          So the current interpretation of investment tracking is: track money
          flowing into investment-related activity as part of the budget. That
          is still useful, but it is very different from modelling positions,
          cost basis, dividends, or performance attribution. If I continued this
          project, that is the clearest boundary between the finance app I have
          and the richer one I might want later.
        </P>

        <H2>The sharp edges are exactly where you would expect</H2>
        <P>
          The biggest tradeoff is privacy versus convenience. Keeping files
          local is good for privacy, but the application itself has almost no
          security model: no authentication, permissive CORS, uploaded PDFs and
          Excels written directly to local folders, and secrets expected via
          environment variables. That is fine for a personal localhost workflow.
          It would not be fine as an internet-facing service.
        </P>
        <P>
          The second tradeoff is correctness at the ingestion boundary. The
          Excel path is robust because the schema is explicit. The PDF path is
          more fragile because it depends on statement wording and model output.
          I even spotted a locale-sensitive amount normalisation risk in the PDF
          parser: if the model returns a value like <Code>-25,90</Code>, a naive
          comma strip can turn that into <Code>-2590</Code> instead of{" "}
          <Code>-25.90</Code>. That is exactly the kind of bug personal finance
          software has to be paranoid about.
        </P>
        <P>
          There are smaller data-quality edges too. The category taxonomy
          contains a few whitespace inconsistencies in parent labels, which is
          the kind of tiny issue that can quietly leak into grouping logic and
          dropdown UX when your storage layer is just files.
        </P>

        <H2>What I would change</H2>
        <P>
          First, I would replace CSV and JSON persistence with a small relational
          store - probably SQLite first, Postgres only if the deployment story
          really demanded it. That would buy me transactions, constraints,
          better update semantics, and cleaner reporting queries without losing
          the local-first feel.
        </P>
        <P>
          Second, I would make ingestion pluggable. Right now the Excel path is
          bank-format-specific and the PDF path encodes a lot of statement
          knowledge directly into one prompt. A better design would separate
          import adapters per bank and treat extraction as a contract with tests
          around sample statements.
        </P>
        <P>
          Third, I would be much stricter about privacy boundaries. If an LLM is
          involved, I want explicit redaction, auditable prompts, and probably a
          local extraction fallback for the most sensitive flows. Personal
          finance data deserves more care than &ldquo;works on my machine&rdquo;.
        </P>
        <P>
          And finally, if I want to keep the &ldquo;investment tracking&rdquo;
          label, I need to earn it: accounts, positions, buys, sells, dividends,
          valuations, and multi-currency support. At the moment the app is
          strongest when it stays honest about what it already is: a transaction
          ingestion and categorisation tool with reporting attached.
        </P>

        <H2>The stack</H2>
        <UL>
          <LI>
            <Em>Backend:</Em> FastAPI, pandas, pdfplumber, matplotlib.
          </LI>
          <LI>
            <Em>AI extraction:</Em> OpenAI <Code>gpt-4o</Code> for parsing PDF
            statement text into structured transactions.
          </LI>
          <LI>
            <Em>Frontend:</Em> Static HTML + vanilla JavaScript served by
            FastAPI.
          </LI>
          <LI>
            <Em>Storage:</Em> CSV and JSON files in the repo directory.
          </LI>
          <LI>
            <Em>Reporting:</Em> Matplotlib image endpoints plus an embedded
            Looker Studio dashboard.
          </LI>
        </UL>
        <P>
          I like this project because it is honest. It does not pretend to be a
          polished banking platform. It solves a real personal workflow with a
          mix of deterministic code and carefully bounded AI, and it shows very
          clearly where the next engineering decisions need to happen.
        </P>
      </article>
    </main>
  );
}
