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
  title: "Building a Databricks data platform that could survive reality - Yves De Boeck",
  description:
    "How I built a production lakehouse on Databricks around batch and streaming sources, medallion layers, dbt, Delta Live Tables, and Unity Catalog.",
  openGraph: {
    title: "Building a Databricks data platform that could survive reality",
    description:
      "A production Databricks platform for SQL, JSON, XML, Kafka, and text feeds.",
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
          Data engineering · 13 min read
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.1] mb-6">
          Building a Databricks data platform that could survive reality
        </h1>
        <p className="text-lg text-slate-400 leading-relaxed mb-16">
          I built this platform from scratch for a large industrial company: one
          lakehouse, many source shapes, and just enough discipline to keep batch
          and streaming pipelines from turning into unrelated systems.
        </p>

        <P>
          The interesting part of this project was never &ldquo;using
          Databricks.&rdquo; Plenty of teams do that. The interesting part was
          making one platform absorb wildly different source systems without
          producing a different architecture for each of them.
        </P>
        <P>
          Some feeds arrived as SQL snapshots. Others were JSON blobs dropped in
          storage by APIs and function apps. Provisioning systems wrote XML.
          Telemetry arrived as text envelopes with base64 payloads. A licensing
          stream came from Kafka. Some jobs were naturally batch. Some were
          continuous in spirit but scheduled in practice. All of it had to land
          in a medallion architecture that operators could understand and that I
          could change without fear.
        </P>
        <P>
          What emerged was a pattern I still like: keep bronze aggressively
          boring, use the right compute mode for the source, push schema and
          business meaning upward, and treat governance as part of the data
          model rather than as a separate admin concern.
        </P>

        <H2>Bronze had to be boring on purpose</H2>
        <P>
          My bronze layer was not where I wanted to be clever. Its job was to
          preserve source truth with just enough metadata to make replay,
          deduplication, and debugging possible later.
        </P>
        <P>
          That meant different landing patterns for different source families:
          SQL extracts were written as Parquet snapshots, semi-structured feeds
          used Auto Loader, and a few especially messy sources were stored as
          full raw payloads in a single text column so silver could parse them
          deterministically.
        </P>
        <Pre>{`source_file_path  STRING
raw_payload       STRING | STRUCT
ingested_at       TIMESTAMP
ingestion_date    DATE
source_status     STRING   -- optional: succeeded / failed
`}</Pre>
        <P>
          That shape sounds almost trivial, but it prevented a lot of pain. One
          JSON pipeline in the repo explicitly switched to <Code>wholeText</Code>{" "}
          reads because line-based ingestion quietly destroyed file boundaries.
          Another moved from overwrite to append because re-runs were erasing
          history. Those are the kinds of bugs you only make once if bronze is
          treated as a preservation layer instead of a convenience layer.
        </P>
        <Callout label="The discipline that mattered most">
          If I couldn&apos;t explain exactly how to replay a day of data from
          storage into bronze, I was doing too much work too early. Bronze is
          where I wanted reversibility, not elegance.
        </Callout>

        <H2>One platform, two compute models</H2>
        <P>
          The cleanest architectural decision in this project was admitting that
          Databricks serverless and classic clusters are different tools, not
          interchangeable deployment targets.
        </P>
        <P>
          Serverless was ideal for short medallion transforms and dbt runs:
          fast startup, little infrastructure friction, and easy scheduling.
          Classic clusters existed for the awkward edges: JDBC drivers, Kafka
          connectivity, and heavier workloads that needed more control.
        </P>
        <Table
          head={["Need", "What I used", "Why"]}
          rows={[
            ["SQL Server ingestion", "Classic cluster", "JDBC drivers and connection control"],
            ["Kafka ingestion", "Classic cluster", "Broker connectivity was not available from serverless"],
            ["Bronze → Silver transforms", "Serverless", "Short jobs, fast startup, simpler ops"],
            ["dbt silver/gold runs", "SQL warehouse + dbt tasks", "Good fit for relational transforms"],
            ["DLT telemetry serving", "Serverless DLT", "Declarative expectations and managed refresh"],
          ]}
        />
        <P>
          That split showed up everywhere. One Kafka pipeline used a classic
          task to read Avro messages from Confluent, wrote Delta to a staging
          path, then handed off to serverless tasks for bronze deduplication and
          silver upserts. Several SQL-backed jobs did the same thing with JDBC:
          extract on classic, transform on serverless.
        </P>
        <P>
          In other words, I stopped asking &ldquo;can Databricks do this?&rdquo;
          and started asking &ldquo;which Databricks runtime should own which
          part of this?&rdquo; That framing produced much more stable jobs.
        </P>

        <H2>Streaming worked best when it still looked like a job</H2>
        <P>
          A lot of the platform behaves like streaming without requiring me to
          run never-ending streams. Auto Loader and Kafka checkpoints let me use{" "}
          <Code>trigger(availableNow=True)</Code> so each scheduled run consumed
          everything since the previous checkpoint, then stopped.
        </P>
        <Pre>{`(
  spark.readStream
    .format("kafka")
    .options(**kafka_options)
    .load()
    .writeStream
    .option("checkpointLocation", checkpoint_path)
    .trigger(availableNow=True)
    .start(staging_path)
    .awaitTermination()
)`}</Pre>
        <P>
          I liked this pattern more than a permanently running stream for two
          reasons. First, operations became predictable: one job run, one set of
          logs, one obvious failure boundary. Second, it unified the mental
          model across batch and streaming sources. In both cases the scheduler
          said &ldquo;process whatever is new,&rdquo; and the checkpoint provided
          the continuity.
        </P>
        <P>
          The Kafka pipeline added another important layer: bronze deduplicated
          on topic, partition, and offset before appending, and silver merged on
          business key. That gave me protection against retries, historical
          re-reads, and source-side redelivery without pretending the raw stream
          was already clean.
        </P>

        <H2>Schema evolution was not one problem</H2>
        <P>
          One lesson I relearned here: &ldquo;schema evolution&rdquo; is not a
          single strategy. XML, permissive JSON, and text-wrapped payloads each
          fail differently, so they deserve different responses.
        </P>
        <P>
          For XML provisioning feeds, I used Auto Loader with{" "}
          <Code>schemaEvolutionMode = "addNewColumns"</Code>. Those sources were
          fairly well behaved, and the right failure mode was to surface new
          fields without blocking ingestion.
        </P>
        <P>
          For more fragile JSON feeds, I preferred{" "}
          <Code>schemaEvolutionMode = "rescue"</Code>. That kept unexpected
          fields in rescued data rather than silently coercing or dropping them.
          In practice, it bought me time: ingestion could keep moving while I
          decided whether the new field belonged in silver.
        </P>
        <P>
          And for a few telemetry-style payloads, I deliberately avoided schema
          inference in bronze altogether. Reading the entire file as raw text was
          less sophisticated, but much safer than baking source assumptions into
          the first layer of the platform.
        </P>
        <Callout label="A gotcha I was glad I caught">
          One source produced JSON keys with spaces, which Delta does not accept
          happily in the default table layout. The fix was not a downstream
          rename; it was enabling column mapping and preserving the payload
          correctly at ingest time. Source quirks belong close to the source.
        </Callout>

        <H2>dbt was the backbone, not the whole skeleton</H2>
        <P>
          dbt earned its place in the silver and gold layers because a lot of
          the hard work eventually became relational: joins, deduplication,
          dimensional modeling, tests, and documentation. The repo grew into a
          real dbt project with separate silver and gold domains, source
          definitions, schema tests, and a mix of full tables, views, and
          incremental models.
        </P>
        <Pre>{`{{ config(
  materialized='incremental',
  incremental_strategy='merge',
  unique_key='source_file_path'
) }}

select *
from {{ source('silver_uploads', 'events') }}
{% if is_incremental() %}
where upload_date >= (select coalesce(max(upload_date), date('2020-01-01')) from {{ this }})
{% endif %}`}</Pre>
        <P>
          But I also tried not to force dbt into problems it was not built to
          solve elegantly. Parsing XML structures, decoding base64 payloads,
          dealing with source-specific timestamp oddities, or reconstructing
          deeply nested telemetry shapes stayed in notebooks first. Once the data
          became tabular and stable, dbt took over.
        </P>
        <P>
          That line mattered. In one MPC domain, dbt parsed raw IoT Hub
          envelopes and also maintained append-only configuration tables where
          defaults were auto-provisioned for newly seen IDs without overwriting
          values owned by an app. In another area, Delta Live Tables was a
          better fit because I wanted expectations and reusable live views around
          telemetry register history.
        </P>

        <H2>The weirdest source bug was a SQL type, not a stream</H2>
        <P>
          The most memorable ingestion problem in the whole platform came from a
          SQL snapshot, not from Kafka.
        </P>
        <P>
          One upstream database wrote Parquet with SQL Server{" "}
          <Code>TIME(6)</Code> semantics. Spark&apos;s normal Parquet path did not
          like that logical type and, annoyingly, failed lazily enough that a
          naive <Code>try/except</Code> around the read was useless. The fix was
          to inspect a sample file with PyArrow, map unsupported types manually,
          then re-read the dataset with an explicit Spark schema.
        </P>
        <Pre>{`pa_schema = pq.read_schema(io.BytesIO(sample_bytes))
spark_schema = StructType([
  StructField(field.name, map_type(field.type), True)
  for field in pa_schema
])

df = spark.read.schema(spark_schema).parquet(path)`}</Pre>
        <P>
          I like that example because it captures what production data
          engineering feels like. The glamorous architecture decision was
          medallion + dbt + DLT. The actual Tuesday problem was &ldquo;why does
          this one Parquet logical type break a perfectly normal ingest?&rdquo;
        </P>
        <P>
          That same pipeline also stripped a password column before silver on
          purpose. Even in an internal platform, I wanted the rule to be simple:
          if a field should not survive ingestion, remove it as early and as
          explicitly as possible.
        </P>

        <H2>Governance was part of the design, not the last sprint</H2>
        <P>
          Unity Catalog was not just the place where tables happened to live. It
          was the mechanism that let the platform stay understandable as it
          expanded across domains.
        </P>
        <P>
          I kept bronze, silver, and gold schemas distinct; used managed tables
          where possible; versioned workspace objects through Databricks Asset
          Bundles; and treated permissions as code. There was even a schema-drift
          check in CI that snapshots Unity Catalog definitions and fails the
          pipeline if the checked-in contract no longer matches what exists in
          the workspace.
        </P>
        <P>
          That might sound bureaucratic, but it solved a real problem: lakehouse
          platforms decay quickly if tables can change silently. The snapshot
          diff forced intentionality. If a schema changed, somebody had to decide
          whether that was a feature, a migration, or a bug.
        </P>
        <P>
          The same thinking showed up in workspace governance. Not every user
          could spin up their own cluster. Shared warehouses and shared classic
          clusters existed for a reason, and access followed environment-specific
          groups instead of ad hoc permissions. It kept cost, reproducibility,
          and supportability tied together.
        </P>

        <H2>Quality checks lived in multiple layers</H2>
        <P>
          I did not want one grand &ldquo;data quality framework.&rdquo; I wanted
          several small mechanisms that each caught a specific class of mistake.
        </P>
        <UL>
          <LI>
            <Em>Notebook unit tests</Em> for transformation helpers, like
            timestamp parsing and column normalization.
          </LI>
          <LI>
            <Em>dbt tests</Em> for not-null, uniqueness, accepted values, and
            documented source contracts.
          </LI>
          <LI>
            <Em>DLT expectations</Em> where dropping or failing bad records was
            part of the table contract.
          </LI>
          <LI>
            <Em>Quarantine tables</Em> for records that should be investigated
            rather than silently discarded.
          </LI>
        </UL>
        <P>
          I especially like the quarantine pattern. In the MPC models, rows with
          unparseable timestamps are not simply thrown away. They are written to
          dedicated quarantine tables with a reason attached. That changes the
          operational conversation from &ldquo;the dashboard looks off&rdquo; to
          &ldquo;here are the exact messages that violated the contract.&rdquo;
        </P>

        <H2>What I would change</H2>
        <P>
          If I were starting again, I would standardize the ingest contract even
          harder. The platform already converged on common ideas - source file
          path, ingested timestamp, append-first bronze, replayability - but the
          implementation still reflects the history of real projects arriving one
          by one.
        </P>
        <P>
          I would probably build a thinner shared ingestion toolkit earlier:
          common observability, a more explicit contract for succeeded/failed
          subfolders, and fewer one-off decisions about when to stage through
          storage versus writing directly to managed tables.
        </P>
        <P>
          I would also invest sooner in lineage and producer-facing contracts.
          The platform is already strong at absorbing schema drift. That is
          useful, but it can make a team too good at tolerating upstream
          inconsistency. A mature platform should be resilient without becoming a
          place where source owners never feel the cost of changing things.
        </P>

        <H2>The stack</H2>
        <UL>
          <LI>
            <Em>Storage and tables:</Em> Delta Lake on Databricks with bronze,
            silver, and gold schemas in Unity Catalog.
          </LI>
          <LI>
            <Em>Ingestion:</Em> Auto Loader, JDBC-based extracts, Azure
            Functions, and Kafka staging with scheduled checkpointed streams.
          </LI>
          <LI>
            <Em>Transforms:</Em> PySpark notebooks for source-heavy parsing; dbt
            for relational silver and gold models; Delta Live Tables for selected
            telemetry workloads.
          </LI>
          <LI>
            <Em>Governance:</Em> Unity Catalog permissions, schema snapshots in
            CI, and workspace configuration managed as code.
          </LI>
          <LI>
            <Em>Delivery:</Em> Databricks Workflows, Databricks Asset Bundles,
            and Azure DevOps pipelines. No click-ops required.
          </LI>
        </UL>
        <P>
          The result was not just a set of pipelines. It was a data platform
          with opinions: preserve raw truth first, make compute choices
          deliberately, let contracts get stricter as data gets cleaner, and
          never treat governance as something you add once the useful work is
          done.
        </P>
      </article>
    </main>
  );
}
