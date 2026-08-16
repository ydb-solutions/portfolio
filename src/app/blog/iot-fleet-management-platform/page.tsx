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
  title: "Building an IoT fleet management platform — Yves De Boeck",
  description:
    "How I built an end-to-end fleet platform for industrial compressors: embedded C++ on Yocto, Azure IoT Hub, WebSockets, firmware updates, and telemetry pipelines.",
  openGraph: {
    title: "Building an IoT fleet management platform",
    description:
      "Embedded C++, Azure IoT Hub, WebSockets, firmware updates, and telemetry pipelines.",
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
          IoT systems · 15 min read
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.1] mb-6">
          Building an IoT fleet management platform
        </h1>
        <p className="text-lg text-slate-400 leading-relaxed mb-16">
          An end-to-end platform for monitoring and controlling industrial
          compressors worldwide — from embedded C++ on Yocto Linux all the way
          to live dashboards, firmware rollout flows, and telemetry pipelines.
        </p>

        <P>
          At my employer, I worked on a fleet platform that had to do two very
          different jobs at once. It had to feel immediate — charts moving,
          commands returning, firmware progress updating live — and it also had
          to behave like industrial software, where devices disappear for hours,
          networks are unreliable, and the safe choice is often the slower one.
        </P>
        <P>
          The interesting part was not any one layer in isolation. It was the
          seams between them: an internal MQTT bus on the controller, a C++
          bridge translating that into Azure IoT Hub semantics, a Python/FastAPI
          backend and React frontend, worker queues for long-running operations,
          WebSocket fan-out for live views, Timescale-style telemetry storage for
          history, and Databricks pipelines for analytical models further
          downstream.
        </P>

        <H2>The shape of the system</H2>
        <P>
          At a high level, the platform split into three paths: a <Em>control
          path</Em> for commands and firmware rollout, a <Em>live path</Em> for
          dashboards, and a <Em>data path</Em> for storage and analytics.
        </P>
        <Pre>{`controller MQTT bus
    -> C++ bridge on Yocto
    -> Azure IoT Hub
        -> Web PubSub groups -> live browser views
        -> worker queues     -> commands / FOTA orchestration
        -> raw storage       -> historical APIs + Databricks bronze/silver/gold`}</Pre>
        <P>
          That split was deliberate. I did not want the dashboard request path
          waiting on analytics jobs, and I definitely did not want a firmware
          rollout sharing the same assumptions as a chart refresh. The same
          telemetry can flow to multiple places, but each path should optimise
          for its own failure mode.
        </P>

        <H2>Why the controller bridge mattered</H2>
        <P>
          The embedded side ran as a C++ service on a custom Yocto Linux image.
          Its job was not to be a giant business-logic brain. Its job was to be
          a narrow, reliable adapter between the controller&apos;s internal MQTT
          ecosystem and the cloud contract.
        </P>
        <P>
          The bridge subscribed to the controller bus, collected ordinary point
          updates into grouped telemetry, and published them to IoT Hub on a
          polling cadence. For time-sensitive cases it had a fast-track path that
          bypassed batching entirely. That seems small, but it is one of those
          decisions that decides whether your cloud bill is sane and whether your
          live charts feel alive.
        </P>
        <P>
          For the newer controller path, the bridge serialised telemetry into a
          FlatBuffers <Code>DeviceData</Code> payload before sending it up. For
          the older controller path, messages were already JSON and the downstream
          data platform routed them by message type. In both cases, the device was
          treated as the source of truth for timestamps; the cloud side deduped
          and normalised, but it did not pretend it could re-invent device order
          after the fact.
        </P>
        <P>
          The same service also auto-detected whether it should authenticate with
          a shared access key or an X.509 certificate. If a certificate was
          present, it monitored expiry, generated a CSR with the existing private
          key, sent that CSR as a tagged telemetry message, accepted the renewed
          certificate through a direct method response, and atomically swapped the
          file on disk before reconnecting. That last part matters more than it
          sounds: a half-written certificate on a field device is the sort of bug
          you only make once.
        </P>
        <Pre>{`// desired properties driving the bridge
{
  "desired": {
    "polling": 30,
    "points": [{ "ids": [1018, 1114], "updateRate": 30, "fastTrack": false }],
    "fastTrack": { "startAt": 1723800000, "duration": 900 },
    "cloudLogs": { "startAt": 1723800000, "duration": 900 },
    "fota": {
      "catalog": {
        "version": "x.y.z",
        "uri": "<signed-download-url>",
        "forceUpdate": false
      }
    }
  }
}`}</Pre>
        <P>
          A pattern I like here is that the bridge stayed mostly state-based. It
          reported what auth mode it was currently using, what points were
          missing, and what certificate expiry it saw. That makes the cloud side
          easier to reason about than an event-only design where you have to infer
          current state from a stream of partial facts.
        </P>

        <H2>Twins for intent, direct methods for immediacy</H2>
        <P>
          One of the biggest architectural choices was deciding when to use
          device twins and when to use direct methods. We used both, but for very
          different jobs.
        </P>
        <Table
          head={["mechanism", "best at", "failure mode", "where I used it"]}
          rows={[
            [
              "desired twin properties",
              "durable intent",
              "arrives late, but survives offline devices",
              "subscriptions, log windows, firmware targets",
            ],
            [
              "direct methods",
              "immediate request/response",
              "fails fast if the device is offline",
              "read/write actions from the UI",
            ],
          ]}
        />
        <P>
          Remote read/write actions in the web app went through a worker queue and
          then into IoT Hub direct methods. The worker built FlatBuffers
          <Code>ReadDirectRequest</Code> or <Code>WriteDirectRequest</Code>
          payloads, base64-encoded them, invoked the device method, decoded the
          response, and persisted the result for the UI. That is the right model
          for something a human just clicked and expects an answer for now.
        </P>
        <P>
          Firmware rollout was different. The desired firmware version and URL
          lived in the twin because the device might be asleep, disconnected, or
          on a poor link. A twin patch is not immediate, but it is durable. That
          mattered much more than low latency.
        </P>
        <Callout label="A rule that held up">
          If the operation meant <Em>“do this when you can”</Em>, I wanted it in
          the twin. If it meant <Em>“do this right now and tell me what
          happened”</Em>, I wanted a direct method. Mixing those two semantics is
          how you end up with a control plane that is confusing both for users and
          for operators.
        </Callout>

        <H2>Live dashboards without broadcasting the whole fleet</H2>
        <P>
          The frontend was a React app, the backend was FastAPI, and the live
          path used Azure Web PubSub. The important part was not just that we used
          WebSockets. It was <Em>how narrowly</Em> we scoped them.
        </P>
        <P>
          The browser opened one WebSocket connection using the Web PubSub JSON
          protocol. From there, it subscribed itself into groups shaped like
          <Code>{`{hub}_{device}_{stream}`}</Code>: telemetry for one device,
          logs for one device, FOTA progress for one device, and a broader
          environment group for cache invalidation events. That let us push
          precisely what a screen needed instead of turning the whole fleet into a
          global broadcast problem.
        </P>
        <Pre>{`group = \`${"${hubName}_${deviceId}_${stream}"}\`

Telemetry     -> live charts
SystemLog     -> diagnostics tail
FotaProgress  -> rollout progress table
env_<id>      -> invalidate affected queries`}</Pre>
        <P>
          The backend exposed a small endpoint that added or removed a connection
          from one of those groups. The log streaming path was especially neat:
          IoT Hub routed cloud logs into blob storage, an Azure Function watched
          the cloud-log container, parsed the JSON lines, grouped them by device,
          and only pushed them to Web PubSub if that device group actually had
          listeners.
        </P>
        <P>
          That meant the expensive path was demand-driven. If nobody was watching
          a device&apos;s logs, the system did almost nothing beyond storing them.
          If someone opened the diagnostics view, the same raw feed became a live
          tail.
        </P>
        <Callout label="The five-second race I kept">
          Web PubSub gives the browser a connection ID before the rest of the
          system is fully caught up. In practice I had a real race between
          “frontend wants to join groups now” and “backend has finished putting
          this user into the right environment context”. The fix in both backend
          and frontend was an explicit five-second delay. It is not elegant, but
          it is honest: sometimes distributed systems hand you eventual
          consistency, and pretending otherwise just moves the bug somewhere
          harder to debug.
        </Callout>

        <H2>Firmware updates on bad networks</H2>
        <P>
          Firmware-over-the-air is where the difference between SaaS software and
          industrial software becomes painfully obvious. On a laptop, the answer
          to a failed update is often “download it again”. On a compressor in the
          field, the answer has to be “make sure the state machine still makes
          sense tomorrow”.
        </P>
        <P>
          The rollout flow started in the backend, but it did not execute there
          directly. The backend persisted intent, approval state, and device
          targets, then pushed work onto Service Bus. A worker app published the
          chosen firmware into a distribution container, generated signed download
          URLs, and updated device twins instead of trying to keep a long-lived
          request open.
        </P>
        <P>
          Two choices here turned out to matter a lot. First, the actual device
          state came back from twin sync, not from wishful thinking. The worker
          periodically compared desired firmware, reported firmware, OTA state,
          and the currently assigned download URL. That is how it decided whether
          a device was still pending, already in progress, complete, superseded by
          a newer version, or just failed.
        </P>
        <P>
          Second, the signed URLs were treated as short-lived infrastructure, not
          permanent identity. The worker published firmware with a limited SAS
          lifetime, renewed URLs before expiry, and then patched twins again in
          batches. The batch size was capped, and the renewal jobs were created
          <Em>sequentially</Em> because IoT Hub twin update jobs do not behave
          well if you flood them in parallel.
        </P>
        <Pre>{`for batch in chunks(devices, 100):
    job = create_twin_update_job(batch, {
        firmware_url: refreshed_signed_url,
        firmware_version: target_version
    })
    wait_until_job_finishes(job)   # create next batch only after this one ends`}</Pre>
        <P>
          That is a good example of an industrial tradeoff. The “fast” design was
          to fan out every job immediately. The <Em>correct</Em> design was to
          respect the platform&apos;s throttling behaviour and move more slowly. The
          retry layer in the worker even handled HTTP 429 with exponential
          backoff and jitter because quota management is not theoretical in a real
          fleet.
        </P>
        <P>
          For the MK6 controller path, there was a second firmware mechanism:
          catalog updates written into desired twin properties, which the
          controller-side bridge translated back onto the internal bus. That let
          the cloud express intent in one place while the embedded side kept local
          ownership of how a safe update is actually applied.
        </P>

        <H2>Telemetry does not stop at the dashboard</H2>
        <P>
          One thing I liked about this platform is that it did not force one
          storage system to do every job badly. The hot path and the analytics
          path were different on purpose.
        </P>
        <P>
          For the web app&apos;s historical APIs, telemetry landed in separate
          time-series databases by device family. The schema was deliberately
          unusual: a message table for envelope metadata, then point-specific
          hypertables like <Code>point_XXXX_telemetry</Code>. That only works when
          your point catalogue is known, but for a fixed industrial domain it
          makes “give me point 11402 for this device over this range” very cheap,
          and that is exactly the query shape the dashboards used.
        </P>
        <P>
          The deeper analytics path ran through Databricks. There the pipeline was
          explicitly medallion-shaped, but with one practical twist: ingest was a
          two-step process because the first stage ran on classic compute with
          storage credentials and the second stage ran on serverless compute
          reading from a Unity Catalog external location.
        </P>
        <Pre>{`IoT Hub raw files
  -> staging Delta path
  -> bronze.messages
  -> silver typed tables
  -> gold marts for connectivity, firmware, and recent telemetry`}</Pre>
        <P>
          The NanoController pipeline decoded the base64 IoT Hub body, extracted
          message-level fields, and stored the raw JSON in bronze. Silver then
          reparsed only the relevant time window and routed rows into five typed
          tables: commission, events, heartbeat, system, and telemetry. It also
          handled schema drift in sensor payloads and normalised legacy device ID
          variants so later joins would not quietly fragment the same physical
          machine into two logical ones.
        </P>
        <P>
          The MK6 path was different because the payload was FlatBuffers rather
          than JSON. Bronze kept the raw message body and content type. Silver
          installed the shared schema package, deserialised only the telemetry
          content type, exploded measurements into point rows, and deduped on
          device, timestamp, and point number. Again, the theme was state over
          stream mythology: I never assumed exactly-once delivery, so dedupe was a
          first-class part of the design.
        </P>
        <P>
          On top of that, dbt built gold tables for questions the product and
          reporting layers actually cared about: recent telemetry joined with
          device metadata, per-device connectivity profiles, monthly connection
          statistics, and latest firmware versions seen in system messages. That
          gave us a clean boundary: the operational product path stayed fast, and
          the analytical path stayed expressive.
        </P>
        <Callout label="One serverless constraint that changed the design">
          In one of the telemetry transforms, normal Spark caching was not
          available on the serverless runtime we were using. The practical
          workaround was to materialise a temporary Delta table and let five
          downstream transforms reuse that instead of each re-parsing the raw JSON.
          It is not the design I would have invented on a whiteboard, but it was
          the right design for the platform I actually had.
        </Callout>

        <H2>What I would change</H2>
        <P>
          The sharpest edge is that the platform still has a lot of modelled
          knowledge about fixed point numbers and device-specific schemas. That is
          great for performance and terrible for change velocity. It works because
          industrial telemetry is relatively stable, but every new device family
          reminds you how much plumbing is implicit in that decision.
        </P>
        <P>
          I would also like a cleaner unification between the operational
          time-series storage and the analytical lakehouse path. Right now that
          split is justified — the query patterns are genuinely different — but it
          does mean two places to reason about retention, dedupe, and schema
          evolution. The architecture is correct; it is just not cheap in
          cognitive load.
        </P>
        <P>
          Finally, I would replace the explicit timing gaps around real-time
          connection setup with stronger end-to-end acknowledgement semantics.
          The current version works, and sometimes that is enough, but it still
          bothers me whenever I see a deliberate sleep in a production control
          path.
        </P>

        <H2>The stack</H2>
        <UL>
          <LI>
            <Em>Device:</Em> C++ on Yocto Linux, internal MQTT bus, FlatBuffers,
            X.509 or SAS auth to IoT Hub.
          </LI>
          <LI>
            <Em>Cloud control plane:</Em> Azure IoT Hub, Service Bus, worker
            functions, blob-backed firmware distribution, twin sync.
          </LI>
          <LI>
            <Em>Product layer:</Em> FastAPI backend, React frontend, Azure Web
            PubSub, per-device live groups, approval workflows.
          </LI>
          <LI>
            <Em>Historical storage:</Em> dedicated time-series PostgreSQL /
            Timescale-style databases with message tables and point hypertables.
          </LI>
          <LI>
            <Em>Analytics:</Em> Databricks, Delta Lake, Unity Catalog, PySpark,
            dbt, bronze/silver/gold telemetry models.
          </LI>
          <LI>
            <Em>Infrastructure:</Em> Bicep, managed identities, no click-ops.
          </LI>
        </UL>
        <P>
          I like this project because it forced me to think across the whole
          stack. It was not enough for any single layer to be elegant. The system
          only worked because the device, cloud, UI, and data platform made
          compatible promises to each other.
        </P>
      </article>
    </main>
  );
}
