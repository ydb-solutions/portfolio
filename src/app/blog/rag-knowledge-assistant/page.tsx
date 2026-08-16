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
  title: "Building a multi-tenant RAG knowledge assistant - Yves De Boeck",
  description:
    "How I shipped a department-scoped knowledge assistant with Azure AI Search, Prompt Flow, hybrid retrieval, and grounded citations.",
  openGraph: {
    title: "Building a multi-tenant RAG knowledge assistant",
    description:
      "How I shipped a department-scoped knowledge assistant with Azure AI Search and Prompt Flow.",
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
          Applied AI · 11 min read
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.1] mb-6">
          Building a multi-tenant RAG knowledge assistant
        </h1>
        <p className="text-lg text-slate-400 leading-relaxed mb-16">
          I built and deployed several internal knowledge assistants for
          different engineering groups at a large industrial company. The
          interesting part was not the chat UI. It was making retrieval,
          isolation, grounding, and operations hold up across very different
          document sets.
        </p>

        <P>
          The system started as a simple idea: take the documents teams already
          had, index them, and make them queryable in plain English. In
          practice, that turned into a fairly opinionated RAG platform:
          department-specific Azure AI Search indexes, scheduled ingestion from
          SharePoint and Atlassian sources, Prompt Flow orchestration, hybrid
          retrieval, and a UI that always showed where an answer came from.
        </P>
        <P>
          What I like about this project is that the hard parts were the real
          production parts. Not &ldquo;can I get a demo working?&rdquo;, but
          &ldquo;how do I keep one team&apos;s knowledge base separate from
          another, preserve source links, keep latency reasonable, and avoid a
          bot that sounds confident while making things up?&rdquo;
        </P>

        <H2>Isolation was an architecture decision, not a prompt</H2>
        <P>
          The first design choice that mattered was tenancy. I did{" "}
          <Em>not</Em> want one giant index with a nice system prompt that said
          &ldquo;please stay in your lane.&rdquo; That is not isolation. That is
          hope.
        </P>
        <P>
          Instead, each department got its own storage container, its own Azure
          AI Search index, and its own flow configuration. On top of that, app
          roles controlled which domains a user could access. In the code, a
          domain maps to a specific flow; in deployment, that flow maps to a
          specific index and source set.
        </P>
        <Pre>{`ft        -> container: ftdata     -> index: idx-ft
materials -> container: materials  -> index: idx-materials
patents   -> container: patents    -> index: idx-patents

role "ChatApp.FT"        => [gpt, ft]
role "ChatApp.Materials" => [gpt, materials]`}</Pre>
        <P>
          That sounds mundane, but it solved a lot at once: cleaner relevance,
          simpler operations, clearer ownership, and a much smaller blast radius
          if an index needed to be rebuilt or a source changed shape.
        </P>
        <Callout label="The gotcha">
          Department isolation is much easier when it exists in storage,
          indexing, and authorization boundaries before the LLM sees anything.
          Once you mix corpora together, every later control becomes harder and
          less trustworthy.
        </Callout>

        <H2>Ingestion lived outside the chat path</H2>
        <P>
          The chat app itself stayed relatively lean. The heavier operational
          work happened earlier in the pipeline: scheduled Azure Functions pulled
          content from document systems, normalized metadata, uploaded files to
          Blob Storage, and then Azure AI Search indexers and skillsets handled
          indexing.
        </P>
        <P>
          For SharePoint sources I split the sync into two phases: discovery
          first, upload second. That sounds like ceremony, but it helped with
          reliability. Large libraries are messy. Files disappear, permissions
          change, and not everything is worth downloading. A separate discovery
          pass made it easier to reconcile deletions, skips, blacklists, and
          binary formats before spending time on transfer.
        </P>
        <P>
          Confluence and Jira sources followed a slightly different path. Their
          pages, attachments, and issue metadata were synced into the
          department&apos;s blob container with normalized fields like creator,
          last editor, source description, issue key, and a path hierarchy that
          could later drive filtering.
        </P>
        <P>
          One detail I appreciated later: source links were preserved all the
          way through. Retrieved chunks were not just free-floating text. They
          stayed attached to a document URL, document name, and chunk ID, which
          made citations and debugging much less painful.
        </P>

        <H2>Chunking was simple by default, with a few format-specific escapes</H2>
        <P>
          The baseline chunking settings were straightforward: 1024 tokens with
          128 tokens of overlap. That is not a magical number. It is a
          pragmatic one. Big enough to preserve local context, small enough to
          keep recall competitive and avoid shoving entire manuals into every
          retrieval result.
        </P>
        <Pre>{`{
  "chunk_size": 1024,
  "token_overlap": 128,
  "semantic_config_name": "default",
  "vector_config_name": "default"
}`}</Pre>
        <P>
          The implementation was more nuanced than the config makes it look.
          Markdown used a Markdown-aware splitter. Python code used a
          code-oriented splitter. General text fell back to recursive splitting
          across sentence and word boundaries. PDF-derived HTML got custom table
          handling so a large table did not become unreadable soup halfway
          through a chunk.
        </P>
        <P>
          That last part mattered. Technical documents are full of tables,
          partial headings, and page artifacts. If chunking destroys structure,
          retrieval quality drops even when your embeddings are good.
        </P>
        <P>
          I also had to be realistic about noise. Some document sets contained
          OCR mistakes, measurement dumps, slide fragments, or attachment junk.
          The indexing pipeline grew extra classification logic to tag document
          type, derive domain-specific facets, and catch low-value chunks such
          as gibberish or raw data tables.
        </P>

        <H2>Retrieval was hybrid for a reason</H2>
        <P>
          I did not build this as a pure vector search system. The actual query
          path combined semantic search and vector search in Azure AI Search,
          using <Code>text-embedding-3-large</Code> for query embeddings. The
          chat flow typically rewrote the user question first, embedded the
          rewritten query, and then executed hybrid retrieval over the relevant
          index.
        </P>
        <Pre>{`search_args = {
  "search_text": rewritten_query,
  "query_type": "semantic",
  "semantic_configuration_name": "idx-ft-semantic-configuration",
  "top": 10,
  "vector_queries": [{
    "kind": "vector",
    "fields": "vector",
    "vector": query_embedding,
    "k": 100
  }]
}`}</Pre>
        <P>
          In practice, that gave me a better balance than either mode alone.
          Keyword and semantic ranking were still useful for exact product names,
          acronyms, and document titles. Vector retrieval helped when the user
          asked the same thing in different words than the source material used.
        </P>
        <P>
          The system also had separate retrieval modes depending on intent. A
          direct fact lookup did not need the same behavior as &ldquo;give me an
          overview of this topic&rdquo; or &ldquo;show me matching
          documents.&rdquo; Prompt Flow routed between strategies like specific
          lookup, clarification, overview, and raw file retrieval.
        </P>
        <Table
          head={["mode", "what it did", "top-k posture"]}
          rows={[
            ["Specific lookup", "fact extraction + answer synthesis", "tight"],
            ["Overview", "cluster hits and summarize themes", "wide"],
            ["File retrieval", "return documents with metadata/facets", "very wide"],
            ["Knowledge meta", "describe the corpus itself", "metadata-first"],
          ]}
        />
        <P>
          One nice side effect of this design is that search mode could widen
          aggressively without making normal answer mode noisy. I could return
          many more results when the user was browsing documents than when they
          were asking a specific question.
        </P>

        <H2>Prompt Flow was the control plane</H2>
        <P>
          I used Prompt Flow for more than just wiring prompts together. It
          became the orchestration layer for query rewriting, strategy routing,
          retrieval, answer generation, and evaluation.
        </P>
        <Pre>{`if search:
    strategy = "File_Retrieval"
elif not think:
    strategy = "Specific_Lookup"
else:
    strategy = analyze_intent(question, available_strategies)`}</Pre>
        <P>
          That structure let me keep the app behavior legible. Instead of one
          giant prompt trying to do everything, each strategy had a narrower
          job. Query rewrite prompts expanded acronyms and chat context.
          Retrieval prompts extracted factual candidates from chunks. Answer
          prompts turned those facts into a response with structured citations.
        </P>
        <P>
          It also made it easier to evolve the system per department. Different
          indexes had different facet fields and metadata richness, but the
          orchestration model stayed mostly the same.
        </P>

        <H2>Grounding was visible, not implicit</H2>
        <P>
          I do not trust enterprise knowledge bots that answer in a polished
          tone and hide the evidence. This one always worked with citation
          objects tied to retrieved chunks. The UI could open the relevant
          source passage, and the backend preserved chunk IDs, file names, and
          source URLs through the whole pipeline.
        </P>
        <P>
          That changed user behavior in a good way. People stopped treating the
          answer as oracle truth and started treating it as a fast path into the
          right document. For this kind of internal knowledge work, that is
          exactly what I wanted.
        </P>
        <P>
          I also liked the bias this created in the prompts themselves. If the
          model has to emit citation IDs that actually exist, it is pushed
          toward extractive behavior instead of bluffing.
        </P>
        <H3>Hallucination mitigation in practice</H3>
        <UL>
          <LI>Use retrieval-first flows rather than open-ended generation.</LI>
          <LI>Rewrite ambiguous queries before embedding them.</LI>
          <LI>Keep answers attached to chunk IDs and source URLs.</LI>
          <LI>Provide file-retrieval mode when the user really wants documents.</LI>
          <LI>
            Use role- and domain-scoped indexes so irrelevant corpora never
            compete in retrieval.
          </LI>
        </UL>

        <H2>I measured retrieval separately from answer quality</H2>
        <P>
          One thing I wanted early was to stop arguing about RAG quality in
          vibes. Prompt Flow made it easy to evaluate answer quality with
          groundedness, relevance, and retrieval score, but I also kept a more
          retrieval-centric evaluation flow for search itself.
        </P>
        <P>
          That search evaluation looked at metrics like recall@k, precision@k,
          unexpected results, MRR, and weighted recall. I liked that split:
          first ask whether the right documents were retrieved, then ask whether
          the answer used them well.
        </P>
        <Pre>{`pf run create --flow eval-search \\
  --data eval.jsonl \\
  --column-mapping \\
    question='\${data.question}' \\
    expected_documents='\${data.expected_documents}' \\
    documents='\${run.outputs.answer}'`}</Pre>
        <P>
          That sounds obvious, but it saved time. If retrieval is weak, prompt
          tuning is mostly theater. Fix the chunks, metadata, filters, or index
          first.
        </P>

        <H2>Cost and latency needed explicit pressure</H2>
        <P>
          The system used <Code>gpt-4.1-mini</Code> in the main flow and{" "}
          <Code>text-embedding-3-large</Code> for retrieval. That was already a
          cost and latency tradeoff: spend more on embeddings where recall
          benefits, spend less on the conversational layer where prompt design
          matters more than raw model size.
        </P>
        <P>
          I made a similar tradeoff in metadata enrichment. Chunk-level prose
          summaries were intentionally disabled in one classification path
          because they were too slow for the value they added. Instead, I kept
          normalized facets on chunks and ran a separate document-level summary
          pass that wrote a short summary and summary vector into a meta index.
        </P>
        <P>
          For long documents, that summary pipeline switched to map-reduce:
          chunk, summarize each section, then reduce into one compact catalog
          entry. It was a good example of spending tokens where they improve the
          browsing experience instead of spending them on every retrieval turn.
        </P>

        <H2>What I would change</H2>
        <P>
          The biggest thing I would improve is unifying the ingestion story.
          Over time the repo accumulated both script-based preparation paths and
          indexer-based paths. That is normal in a real system, but it means the
          architecture is slightly more historical than ideal.
        </P>
        <P>
          I would also push evaluation further toward a continuous regression
          suite per domain. The building blocks are already there, but the next
          step is to treat retrieval quality more like a product KPI than a
          periodic experiment.
        </P>
        <P>
          Finally, I would invest more in freshness and change detection. The
          sync jobs are solid, but once teams start relying on an assistant
          daily, the question becomes less &ldquo;can it answer?&rdquo; and more
          &ldquo;how quickly does it reflect new truth?&rdquo;
        </P>

        <H2>The stack</H2>
        <UL>
          <LI>
            <Em>Chat app:</Em> React frontend, Python backend, async background
            chat execution.
          </LI>
          <LI>
            <Em>Retrieval:</Em> Azure AI Search with semantic + vector hybrid
            queries.
          </LI>
          <LI>
            <Em>Embeddings:</Em> <Code>text-embedding-3-large</Code>.
          </LI>
          <LI>
            <Em>LLM orchestration:</Em> Prompt Flow with intent routing,
            retrieval, and evaluation flows.
          </LI>
          <LI>
            <Em>Ingestion:</Em> Azure Functions syncing SharePoint, Confluence,
            and Jira content into Blob Storage.
          </LI>
          <LI>
            <Em>State:</Em> Cosmos DB for chat history and application state.
          </LI>
          <LI>
            <Em>Infrastructure:</Em> Bicep and pipeline-driven deployments, with
            per-domain resources and minimal click-ops.
          </LI>
        </UL>
        <P>
          The project taught me that a good RAG system is usually not about one
          clever prompt. It is about making indexing, retrieval, authorization,
          evaluation, and product behavior all agree on what the system is
          allowed to know and how confidently it should say it.
        </P>
      </article>
    </main>
  );
}
