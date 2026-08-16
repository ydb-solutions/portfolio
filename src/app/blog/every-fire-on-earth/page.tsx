import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Abstract,
  Callout,
  Code,
  Em,
  H2,
  H3,
  KeyPoint,
  LI,
  P,
  Pre,
  Table,
  UL,
} from "@/components/blog/Prose";

export const metadata: Metadata = {
  title: "Every fire on Earth, every morning — Yves De Boeck",
  description:
    "Building a global thermal-anomaly pipeline on Databricks Free Edition: NASA FIRMS, H3 hexagons, and the constraints that shaped the architecture.",
  openGraph: {
    title: "Every fire on Earth, every morning",
    description:
      "Building a global thermal-anomaly pipeline on Databricks Free Edition.",
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
          Data engineering · 20 min read
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.1] mb-6">
          Every fire on Earth, every morning
        </h1>
        <p className="text-lg text-slate-400 leading-relaxed mb-16">
          Three polar-orbiting satellites see roughly a quarter of a million
          thermal anomalies a day. This is how I turn that into a globe you can
          spin — on a free Databricks tier that is not allowed to talk to NASA.
        </p>

        <Abstract>
          <Pre>{`NASA FIRMS API      3 VIIRS satellites · ~250k detections/day · CSV
      │  06:15   GitHub Actions — the lakehouse may not call NASA
  bronze          delete-then-insert by date; NRT revisions self-heal
      │  07:15   dbt build (models + tests)
  silver          dedupe on natural key · repair unpadded timestamps
                  · index into H3 at resolutions 3, 4 and 5
  gold            5 models: hex aggregates · daily totals · fire
                  complexes · raw detections · cross-validation
      │  07:45
  published       static site + PMTiles archive — no backend at all`}</Pre>
          <ul className="space-y-2.5 mt-5 text-[0.95rem] leading-relaxed">
            <KeyPoint label="Ingest runs outside the lakehouse.">
              Free Edition restricts serverless egress to an allowlist that does
              not include NASA, so the network-touching step is a scheduled job
              that pushes inward.
            </KeyPoint>
            <KeyPoint label="Idempotency is date-keyed replacement, not a cursor.">
              Near-real-time data revises its own past; an append-only watermark
              would accumulate stale versions of the same detection.
            </KeyPoint>
            <KeyPoint label="Hexagons, because cell area must be comparable.">
              A 1°×1° box covers ~12,300 km² at the equator and ~4,200 km² at
              70°N, which would turn every tropics-versus-boreal comparison into
              an artifact of the projection.
            </KeyPoint>
            <KeyPoint label="All three H3 resolutions are indexed independently.">
              Deriving coarse cells by truncating fine ones misattributes 7.15% of
              points, because H3&apos;s geometric containment is only approximate.
            </KeyPoint>
            <KeyPoint label="The public demo has no backend.">
              Databricks Apps cannot be made public, so answers are precomputed
              and PMTiles turns a plain file host into a tile server via HTTP
              range requests.
            </KeyPoint>
            <KeyPoint label="Total running cost: €0/month.">
              Free tiers throughout, and the constraint improved the architecture
              more than a budget would have.
            </KeyPoint>
          </ul>
        </Abstract>

        <P>
          Every morning at 06:15 UTC a job wakes up, downloads the last three days
          of active-fire detections from NASA, and by 07:15 a dbt DAG has folded
          them into hexagons at three zoom levels. The result is a MapLibre globe:
          drag it, and you are looking at where the planet is burning.
        </P>
        <P>
          The interesting parts of this project were not the parts I expected. The
          satellite data was easy. What shaped the architecture were three
          constraints: a platform that blocks outbound network calls, a data feed
          that rewrites its own past, and a projection problem that would have
          quietly invalidated every comparison I wanted to make.
        </P>

        <H2>The constraint that shaped everything</H2>
        <P>
          The whole platform runs on Databricks Free Edition — serverless only, one
          workspace, zero cloud spend. That last part is a real design goal, not a
          brag: I wanted to prove the architecture stands up without a corporate
          account behind it.
        </P>
        <P>
          Free Edition restricts serverless egress to an allowlist of trusted
          domains. NASA is not on it. So the most basic operation in the pipeline —{" "}
          <Code>GET</Code> a CSV from a public API — cannot happen inside the
          lakehouse.
        </P>
        <P>
          Rather than fight that, I inverted it. The network-touching step runs
          <Em> outside</Em> Databricks as a scheduled GitHub Actions workflow that
          pushes <Em>into</Em> the workspace: files through the Files API, metadata
          through the SQL warehouse. I call these ground stations, and there are
          three of them — one for Copernicus Sentinel-2 imagery, one for Mars rover
          telemetry, and this one for fires.
        </P>
        <Callout label="Why this is not a hack">
          Real satellite operations work exactly this way. A ground station is a
          thing on Earth that receives a downlink and forwards it inward; the
          spacecraft does not reach into your data centre. The platform limitation
          pushed me toward an architecture that turned out to be a better fit for
          the domain than the one I would have written by default.
        </Callout>

        <H2>What the data actually is</H2>
        <P>
          NASA FIRMS publishes near-real-time detections from VIIRS, the imaging
          radiometer flying on Suomi-NPP, NOAA-20 and NOAA-21. Three separate
          satellites in three separate polar orbits, so pulling all three is not
          redundancy — it is more passes per day over the same ground.
        </P>
        <P>
          Each row is one 375-metre pixel that the onboard algorithm flagged as
          anomalously hot, based on the ratio between two infrared channels:
        </P>
        <Pre>{`latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,
satellite,instrument,confidence,version,bright_ti5,frp,daynight
21.41485,-158.0162,337.92,0.48,0.4,2026-07-18,7,N,VIIRS,
n,2.0NRT,300.46,3.13,D`}</Pre>
        <P>
          The field that matters most is <Code>frp</Code> — Fire Radiative Power,
          in megawatts. It is the energy release rate, and the best available proxy
          for how hard something is burning. It is what I weight by, colour by, and
          sort by throughout the stack.
        </P>
        <Callout label="An honesty problem worth naming">
          VIIRS detects <Em>thermal anomalies, predominantly active fires</Em> —
          not fires exclusively. Gas flares over oil fields, steel mills and active
          volcanoes all show up as persistent hotspots. Any dashboard that labels
          this data &ldquo;fires&rdquo; without qualification is lying slightly. I
          surface the confidence field everywhere rather than silently filtering,
          and flagging persistent industrial sources is on the roadmap once I have
          enough history to detect what burns every single day.
        </Callout>

        <H2>A feed that rewrites its own past</H2>
        <P>
          Near-real-time data is provisional. NASA restates recent detections as
          better geolocation becomes available, so yesterday&apos;s rows are not
          guaranteed to match what you fetched yesterday.
        </P>
        <P>
          The obvious design — a watermark cursor, append everything newer than
          last time — is wrong here. It would accumulate stale duplicates of the
          same detection, each a slightly different version of the truth.
        </P>
        <P>So the ingest is date-keyed replacement instead:</P>
        <Pre>{`DELETE FROM firms_bronze.detections WHERE acq_date >= :min_date

INSERT INTO firms_bronze.detections
SELECT source, latitude, ..., current_timestamp()
FROM read_files('/Volumes/.../detections_20260815T061500.csv',
                format => 'csv', schemaHints => '...',
                mode => 'FAILFAST')`}</Pre>
        <P>
          Fetch three days, delete those three days, re-insert them. No cursor
          table, no watermark, no state to corrupt. Three properties fall out for
          free: re-running is safe, NASA&apos;s revisions self-heal, and a missed
          run is repaired by the next one because the window is wider than the
          schedule.
        </P>
        <P>
          Two smaller decisions in that snippet matter more than they look.{" "}
          <Code>mode =&gt; &apos;FAILFAST&apos;</Code> means a malformed row aborts
          the entire insert rather than landing as nulls, and the ingest separately
          rejects any CSV whose header has drifted from the expected 14 columns. A
          schema change upstream should break my pipeline loudly, not quietly
          corrupt a year of history.
        </P>

        <H2>Three layers, three different jobs</H2>
        <P>
          Everything downstream of that insert is a medallion architecture —
          bronze, silver, gold — and the split is not ceremony. Each layer is
          allowed to do exactly one kind of work, which is what makes it possible
          to reason about where a bug can live.
        </P>
        <UL>
          <LI>
            <Em>Bronze</Em> lands the data as it arrived, typed but otherwise
            unaltered, and fails loudly if it does not match expectations. No
            interpretation.
          </LI>
          <LI>
            <Em>Silver</Em> makes it trustworthy: deduplicated, correctly typed,
            enriched with the keys everything downstream joins on. Still one row
            per detection.
          </LI>
          <LI>
            <Em>Gold</Em> answers questions. Every model here exists because
            something in the UI asks for it.
          </LI>
        </UL>
        <P>
          Bronze onwards is entirely dbt, which matters for a reason beyond taste:
          three separate projects (fires, Sentinel-2, and Mars telemetry) share one
          dbt project, isolated by tag. The fires job runs{" "}
          <Code>dbt build --select tag:firms</Code> and touches nothing else.
        </P>

        <H3>What silver actually cleans</H3>
        <P>
          One model, <Code>detections_clean</Code>, doing four things.
        </P>
        <P>
          <Em>First, deduplicate on the natural key.</Em> Bronze already guarantees
          no duplicates through delete-then-insert, so this is belt and braces —
          but it means the natural key holds regardless of how bronze was loaded,
          including by a future me doing a manual backfill at 11pm:
        </P>
        <Pre>{`qualify row_number() over (
    partition by source, latitude, longitude,
                 acq_date, acq_time, satellite
    order by ingested_at desc
) = 1`}</Pre>
        <P>
          Those six columns are what actually identify a detection: one satellite,
          one pixel, one overpass. <Code>ingested_at desc</Code> keeps the most
          recently loaded copy, which is the one reflecting NASA&apos;s latest
          revision.
        </P>
        <P>
          <Em>Second, build a real timestamp.</Em> This is where the unpadded time
          field bites. NASA sends <Code>HHMM</Code> with leading zeros stripped, so
          a fire detected at seven minutes past midnight arrives as the string{" "}
          <Code>7</Code>:
        </P>
        <Pre>{`to_timestamp(
    concat(cast(acq_date as string), ' ', lpad(acq_time, 4, '0')),
    'yyyy-MM-dd HHmm'
) as acq_datetime`}</Pre>
        <P>
          Without the <Code>lpad</Code>, every detection in the first ten hours of
          each day either fails to parse or lands at the wrong hour. It is a
          one-function fix, but the kind that produces a subtly wrong dashboard
          rather than an error.
        </P>
        <P>
          <Em>Third, index into H3</Em> at three resolutions — the next two
          sections are about why, because it is the most interesting decision in
          the pipeline.
        </P>
        <P>
          <Em>Fourth, drop what nothing uses:</Em> scan and track geometry,
          instrument name, algorithm version.
        </P>
        <Callout label="What silver deliberately does not do">
          It does not filter. Every detection survives, including low-confidence
          ones and the gas flares I know are not wildfires. Filtering is a
          presentation decision, and a silver layer that bakes one in has destroyed
          information for every future consumer who wanted a different answer. Gold
          models that need a quality signal compute a high-confidence count
          alongside the total instead of dropping rows.
        </Callout>

        <H2>Why hexagons</H2>
        <P>
          A quarter-million points a day is too many to draw. They need
          aggregating, and the obvious way is to round the coordinates:{" "}
          <Code>GROUP BY round(lat, 1), round(lon, 1)</Code>.
        </P>
        <P>That would have quietly ruined the project.</P>
        <P>
          Meridians converge toward the poles. A one-degree box covers about 12,300
          km² at the equator and about 4,200 km² at 70°N. The regions I monitor
          span the Angola/DRC miombo belt at 10°S and the Northwest Territories
          boreal complex at 64°N — so &ldquo;detections per cell&rdquo; would mean
          something different in each place, and every comparison between the
          tropics and the boreal forest would be measuring the map projection
          instead of the fires.
        </P>
        <P>
          <a
            href="https://h3geo.org/docs/highlights/indexing/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
          >
            H3
          </a>{" "}
          solves this. It tiles the globe with near-equal-area hexagons by
          subdividing an icosahedron and projecting onto the sphere. Sixteen
          resolutions; I index three of them:
        </P>
        <Table
          head={["res", "cells worldwide", "avg area", "roughly"]}
          rows={[
            ["3", "41,162", "12,393 km²", "a small country"],
            ["4", "288,122", "1,770 km²", "a metro area"],
            ["5", "2,016,842", "253 km²", "a large city"],
          ]}
        />
        <P>
          Indexing is just bucketing: a continuous coordinate becomes a discrete
          cell ID, and a spatial question turns into string equality. No geometry
          library, no spatial join —{" "}
          <Code>GROUP BY h3_5</Code> is an ordinary hash aggregation.
        </P>
        <P>
          Hexagons buy a second property that squares cannot: uniform adjacency.
          Every hexagon has six neighbours, all equidistant. A square grid has four
          edge-neighbours and four corner-neighbours 1.41× further away, so
          &ldquo;adjacent&rdquo; is ambiguous — which matters the moment you try to
          cluster or model spread.
        </P>

        <H2>The 7% bug I nearly shipped</H2>
        <P>
          My silver table computes all three resolutions independently from the raw
          coordinate:
        </P>
        <Pre>{`h3_h3tostring(h3_longlatash3(longitude, latitude, 3)) as h3_3,
h3_h3tostring(h3_longlatash3(longitude, latitude, 4)) as h3_4,
h3_h3tostring(h3_longlatash3(longitude, latitude, 5)) as h3_5`}</Pre>
        <P>
          That looks wasteful. H3 is hierarchical — the cell IDs literally share a
          prefix — so surely you index once at the finest resolution and truncate
          to get the coarser ones?
        </P>
        <P>
          No. <Em>Hexagons do not tile into hexagons.</Em> You cannot subdivide a
          hexagon into seven smaller hexagons cleanly; H3&apos;s children only{" "}
          <a
            href="https://observablehq.com/@nrabinowitz/h3-hierarchical-non-containment"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
          >
            approximately tile their parent
          </a>
          , overlapping and gapping at the edges. Logical containment in the index
          is exact; geographic containment is not.
        </P>
        <P>I measured it over 200,000 random points:</P>
        <Pre>{`14,309 / 200,000  (7.15%)  of points land in a res-5 cell
whose res-4 parent differs from the point's
directly-assigned res-4 cell`}</Pre>
        <P>
          Rolling up instead of re-indexing would have misattributed about 7% of
          detections to the wrong coarse hexagon — and not randomly. The errors
          concentrate at cell boundaries, which is exactly where a large fire
          complex straddles two cells and where you most want the count to be
          right.
        </P>
        <Callout label="The general lesson">
          Hierarchical index systems tempt you to treat the hierarchy as geometry.
          Check whether your parent-child relationship is exact or approximate
          before you optimise around it — the version that looks redundant was the
          correct one, and it cost nothing.
        </Callout>

        <H2>What gold actually computes</H2>
        <P>
          Five models, all dbt, all rebuilt every morning — and rebuilt with{" "}
          <Code>dbt build</Code> rather than <Code>dbt run</Code>, which is the
          difference between running the models and running the models{" "}
          <Em>plus their tests</Em>. Grain uniqueness and not-null assertions
          execute on every daily run, and a failure fails the job. Silently
          producing a duplicated hexagon is not a failure mode I want to discover
          from the map looking wrong.
        </P>

        <H3>fires_daily_h3 — the hexagons</H3>
        <P>
          Three resolutions stacked into one table by a Jinja loop that unions
          three aggregations of the same source:
        </P>
        <Pre>{`{% for res in [3, 4, 5] %}
select {{ res }} as h3_res, h3_{{ res }} as h3_cell, acq_date,
       count(*) as n_detections, sum(frp) as frp_sum,
       sum(case when confidence = 'h' then 1 else 0 end) as n_high_conf
from {{ ref('detections_clean') }}
group by h3_{{ res }}, acq_date
{% if not loop.last %}union all{% endif %}
{% endfor %}`}</Pre>
        <P>
          The two Jinja expressions do different things and it is worth reading
          them slowly: <Code>{`{{ res }}`}</Code> emits a literal (3, 4 or 5),
          while <Code>{`h3_{{ res }}`}</Code> emits a{" "}
          <Em>column name</Em>. So the resolution tag has three distinct values
          across the whole table, while the cell column holds tens of thousands.
        </P>
        <P>
          Stacking them means the client swaps aggregation level on zoom with one
          query shape and a changed integer, rather than three different endpoints.
          The grain — resolution, cell, date — is enforced by a uniqueness test, so
          the union cannot quietly produce overlapping rows.
        </P>

        <H3>fires_daily_stats — the headline numbers</H3>
        <P>
          The same aggregation with the spatial dimension removed: one row per day,
          global totals, feeding the counters above the map.
        </P>
        <P>
          It looks redundant — surely you can sum the hexagons? Almost, but not
          quite, and the exception is a nice reminder that{" "}
          <Em>not every aggregate is additive</Em>. Detection counts and total fire
          power roll up fine. The number of distinct satellites contributing does
          not: summing per-cell distinct counts would count Suomi-NPP once per
          hexagon it appears in. Distinct counts have to be computed at the grain
          you want to read them at.
        </P>

        <H3>active_fires — the one with actual logic in it</H3>
        <P>
          &ldquo;Fire complexes&rdquo; over the trailing 48 hours: coarse cells with
          at least three detections, ranked by intensity. Three decisions in here I
          would defend in a review.
        </P>
        <P>
          <Em>The window is anchored to the data, not the clock:</Em>
        </P>
        <Pre>{`with window_bounds as (
    select max(acq_datetime) as latest from {{ ref('detections_clean') }}
)`}</Pre>
        <P>
          Using <Code>current_timestamp()</Code> would have been the obvious move
          and it would have been wrong twice over. Wrong for testing, because the
          model produces different output depending on when you run it. And wrong
          operationally: if ingest fails one morning, a wall-clock window silently
          slides past all the data and the map goes empty, which looks like
          &ldquo;no fires on Earth today&rdquo; rather than &ldquo;the pipeline is
          broken&rdquo;. Anchored to the newest row, it just shows slightly older
          data and stays obviously alive.
        </P>
        <P>
          <Em>The centroid is weighted by fire power:</Em>
        </P>
        <Pre>{`sum(latitude * frp) / sum(frp)  as centroid_lat,
sum(longitude * frp) / sum(frp) as centroid_lon`}</Pre>
        <P>
          A plain average puts the marker in the geometric middle of the
          detections, which for a long fire front is often somewhere nothing is
          burning. Weighting by power drags it toward the hottest part — where you
          would actually send an aircraft. This is also why the model filters to
          rows with positive fire power: the division needs a non-zero denominator.
        </P>
        <P>
          <Em>The trend is a ratio of consecutive 24-hour halves:</Em>
        </P>
        <Pre>{`sum(case when acq_datetime > latest - interval 24 hours
         then frp else 0 end)
  / nullif(sum(case when acq_datetime <= latest - interval 24 hours
                    then frp end), 0) as frp_trend`}</Pre>
        <P>
          Above 1 means growing, below means dying down. The{" "}
          <Code>nullif</Code> matters more than it looks: a complex with no
          activity in the previous period would divide by zero, and the honest
          answer there is not &ldquo;infinite growth&rdquo; but{" "}
          <Em>null</Em> — a brand-new fire with no baseline to compare against.
          Encoding &ldquo;I cannot know this&rdquo; distinctly from a number is
          most of what makes a metric trustworthy.
        </P>
        <P>
          Finally a noise floor of at least three detections. One hot pixel is not
          a fire complex; it is usually a factory.
        </P>

        <H3>detections_recent — a view, for an unglamorous reason</H3>
        <P>
          Last seven days of individual detections, unaggregated. It exists in gold
          purely because of permissions: the app&apos;s service principal is granted
          read access to the gold schema only, and Unity Catalog views execute with
          their owner&apos;s privileges. The view lets the app read silver-grade
          data without ever holding a grant on silver. Not a modelling decision at
          all — an access-control one wearing a modelling costume.
        </P>

        <H3>s2_firms_agreement — checking one pipeline against another</H3>
        <P>
          The one I find most satisfying. My Sentinel-2 pipeline detects burn scars
          optically, by measuring how vegetation reflectance changed between two
          dates. FIRMS detects heat. Those are genuinely independent physical
          signals from different satellites, so where they agree, confidence goes
          up a lot.
        </P>
        <P>
          This view joins them: FIRMS points falling inside a monitored region are
          mapped onto the Sentinel-2 analysis grid and matched to burn-scar cells
          within three days. It is a view rather than a table because the two
          pipelines rebuild an hour apart — a table would always be showing one run
          of stale agreement.
        </P>

        <H2>Sending IDs instead of shapes</H2>
        <P>
          One detail I am fond of. The API never sends hexagon geometry to the
          browser. It sends the cell ID and two numbers:
        </P>
        <Pre>{`{ "h3": "8446483ffffffff", "n": 214, "frp": 8231.4 }`}</Pre>
        <P>
          The client reconstructs the polygon with <Code>cellToBoundary()</Code>{" "}
          from h3-js. A hexagon as GeoJSON is seven coordinate pairs — around 120
          bytes. As an H3 ID it is 15 characters. Across tens of thousands of cells
          that is most of an order of magnitude of bandwidth, and the client-side
          cost is a function call that was already loaded.
        </P>
        <P>
          The string form is not cosmetic either. H3 IDs are 64-bit integers, and
          JSON has no int64 —{" "}
          <Code>591208020730445823</Code> exceeds JavaScript&apos;s safe integer
          range and would silently lose precision in transit. The hex string is the
          only safe wire format.
        </P>

        <H2>The demo has no backend at all</H2>
        <P>
          There is a constraint I did not see coming until I tried to share this.
          Databricks Apps cannot be made public — anonymous access and SSO bypass
          are unsupported, and the free tier has no identity provider to enrol
          outside viewers through. A link to the running app shows every visitor a
          login wall they have no way past.
        </P>
        <P>
          So the globe is republished every morning as a static site instead. Worth
          being precise about what that means, because the word is slippery: the
          frontend was <Em>always</Em> static — a compiled bundle of HTML, CSS and
          JavaScript. What changed is that there is no longer a{" "}
          <Em>server process</Em> sitting next to those files. Previously one
          uvicorn process served both the bundle and the <Code>/api/*</Code> routes
          that queried the warehouse. Now there is a file host and nothing else.
        </P>
        <P>
          That single change has a sharp consequence: nothing can answer a question
          at request time, so every answer has to exist as a file before anyone
          asks it.
        </P>
        <P>
          For the hexagons that is easy. The UI only ever asks for three
          resolutions across three time windows, so there are nine possible
          answers and I pre-render all nine to JSON. For individual detections it
          is not easy at all, because the question is &ldquo;what is inside{" "}
          <Em>this</Em> box&rdquo; and every pan and zoom invents a new box. You
          cannot enumerate those.
        </P>

        <H3>Changing the question</H3>
        <P>
          The fix is{" "}
          <a
            href="https://docs.protomaps.com/pmtiles/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
          >
            PMTiles
          </a>
          , and what I like about it is that it does not answer the hard question —
          it replaces it with an easy one.
        </P>
        <P>
          Map data is conventionally cut into tiles: a grid at each zoom level,
          each square stored separately. That normally means hundreds of thousands
          of files and a tile server to route between them. PMTiles packs the whole
          pyramid into one file with an index at the front. The client reads the
          index, works out that the tile it wants sits at a particular byte offset,
          and asks for exactly those bytes:
        </P>
        <Pre>{`GET /fires.pmtiles
Range: bytes=4182000-4190999`}</Pre>
        <P>
          That is an ordinary HTTP range request — the same mechanism that lets you
          scrub into the middle of a video without downloading it. &ldquo;Which
          detections are in this box?&rdquo; requires understanding the data.
          &ldquo;Give me these bytes&rdquo; requires understanding nothing, which
          is precisely why a dumb file host can serve it.
        </P>
        <Callout label="The version with no server is the better one">
          The live API capped results at 10,000 detections ordered by fire power,
          because an unbounded viewport query would have been unbounded work — the
          UI carried a &ldquo;showing top 10k, zoom in&rdquo; badge to admit it. The
          tiled version has no cap: all 1.75M detections are addressable, because
          the client only ever pulls the handful of tiles under the viewport. The
          debounce disappeared too. Removing the backend deleted code and removed a
          limitation rather than adding one.
        </Callout>
        <P>
          One wrinkle worth recording, since I got it wrong first. I assumed the
          whole thing could sit on Cloudflare Pages. It cannot: Pages does not
          serve range requests correctly and caps files at 25 MiB, and the archive
          is larger than that. The tiles live on R2 — object storage, range
          requests supported, no egress fees — while Pages serves the bundle and
          the small JSON. Two hosts, still nothing to operate, still zero a month.
        </P>

        <H2>What I would change</H2>
        <P>
          The honest weakness is retention. Bronze never prunes, and every silver
          and gold model is a full rebuild, so each morning re-aggregates the
          entire history. At current volume that is fine. After a year it is 90
          million rows being re-scanned daily to recompute numbers that have not
          changed since they landed.
        </P>
        <P>
          The fix is not exotic — incremental models keyed on acquisition date with
          a lookback matching the revision window, plus a retention policy on
          bronze. I have deliberately not built it yet, because the pipeline that
          exists is correct and the one I would replace it with is merely faster,
          and I would rather have a stated tradeoff than a premature optimisation.
        </P>
        <P>
          The second weakness is a fragile join. A view cross-validates my
          Sentinel-2 burn-scar detections against FIRMS hotspots by recomputing my
          analysis-grid cell IDs in SQL — duplicating a formula that lives in
          Python. Nothing enforces that the two stay in sync. If I change the grid,
          the view produces wrong joins silently rather than failing. A shared
          fixture asserting both implementations agree is the real fix; a code
          comment is what is there now.
        </P>
        <P>
          The third is not a weakness so much as a ceiling. Precomputing every
          answer works because the questions are few and known — nine hex slices
          and a fixed tile pyramid. It stops working the moment someone wants to
          ask something I did not anticipate: filter by satellite, compare two
          arbitrary date ranges, draw their own region of interest. That is the
          point at which I would put the API back, on Cloud Run with a real
          database and a cache in front, and keep the tiles for the bulk geometry.
          I would rather arrive there because a question demanded it than start
          there because it felt more like architecture.
        </P>

        <H2>The stack</H2>
        <UL>
          <LI>
            <Em>Source:</Em> NASA FIRMS area API, three VIIRS NRT feeds, CSV.
          </LI>
          <LI>
            <Em>Ingest:</Em> Python on GitHub Actions cron — the ground station.
          </LI>
          <LI>
            <Em>Lakehouse:</Em> Databricks Free Edition — Unity Catalog, Delta, UC
            Volumes, serverless SQL.
          </LI>
          <LI>
            <Em>Transform:</Em> dbt, tag-isolated so three projects share one dbt
            project without colliding. H3 via native Databricks SQL functions.
          </LI>
          <LI>
            <Em>Serving:</Em> React 19 and MapLibre GL globe projection, h3-js for
            client-side geometry. FastAPI behind it in the workspace app; nothing
            behind it in the public one.
          </LI>
          <LI>
            <Em>Publishing:</Em> tippecanoe builds the tile archive; Cloudflare
            Pages serves the bundle, R2 serves the tiles. Republished daily by a
            scheduled workflow.
          </LI>
          <LI>
            <Em>Infrastructure:</Em> Terraform for workspace objects, Databricks
            Asset Bundles for jobs and apps. No click-ops.
          </LI>
        </UL>
        <P>
          Total running cost: zero. That constraint produced better engineering
          than a budget would have — every architectural decision had to be
          justified against a platform that said no a lot.
        </P>
      </article>
    </main>
  );
}
