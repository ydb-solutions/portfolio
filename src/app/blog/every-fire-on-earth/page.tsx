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
          Data engineering · 12 min read
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.1] mb-6">
          Every fire on Earth, every morning
        </h1>
        <p className="text-lg text-slate-400 leading-relaxed mb-16">
          Three polar-orbiting satellites see roughly a quarter of a million
          thermal anomalies a day. This is how I turn that into a globe you can
          spin — on a free Databricks tier that is not allowed to talk to NASA.
        </p>

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
            <Em>Serving:</Em> FastAPI + React 19, MapLibre GL globe projection,
            h3-js for client-side geometry.
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
