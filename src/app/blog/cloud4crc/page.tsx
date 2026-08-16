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
  title: "Cloud4crc: a modular monolith for desktop tools - Yves De Boeck",
  description:
    "How I built a FastAPI platform that serves multiple desktop tools, preserves old API contracts, and leans on Azure primitives instead of microservice sprawl.",
  openGraph: {
    title: "Cloud4crc: a modular monolith for desktop tools",
    description:
      "A FastAPI platform with dual API contracts, layered auth, and Azure-native delivery.",
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
          Backend engineering · 11 min read
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.1] mb-6">
          Cloud4crc: a modular monolith for desktop tools
        </h1>
        <p className="text-lg text-slate-400 leading-relaxed mb-16">
          At my employer, field tooling cannot always update on my schedule. This
          API platform is interesting precisely because it accepts that reality:
          one codebase, multiple contracts, several downstream systems, and a lot
          of effort spent on staying compatible without freezing in place.
        </p>

        <P>
          Cloud4crc is a Python/FastAPI service I built to sit behind a set of
          desktop tools used by service technicians. I did not aim for a flashy
          algorithm or a sprawling microservice estate. I deliberately kept it
          compact: a backend that does a handful of things well while
          acknowledging that desktop software in the field is awkward to evolve.
        </P>
        <P>
          It hosts file-conversion APIs, asynchronous upload endpoints,
          device-registration flows, an autotune service that calls into domain
          logic and external systems, and a smaller legacy decryption endpoint.
          It also carries its own Azure infrastructure, CI/CD, OpenAPI
          generation, and E2E tests for both old and new contracts. That makes
          it a good example of a <Em>modular monolith</Em>: several capabilities
          in one deployable unit, but with clean enough boundaries that each one
          still reads like a product surface rather than a pile of helpers.
        </P>

        <H2>The shape of the system</H2>
        <P>
          The app is a single FastAPI service, but it exposes multiple distinct
          API families. Each contract version ships eight public routes,
          grouped around four main jobs: scan conversion and upload, zip uploads
          for another desktop workflow, device registration against an IoT
          backend, and autotune calculations for compressor control.
        </P>
        <Table
          head={["area", "v1 shape", "v2 shape", "what it does"]}
          rows={[
            [
              "Scan handling",
              "/api/convert_scan, /upload_file",
              "/api/v2/optimizer/*",
              "Converts uploaded scan files and stores uploads asynchronously.",
            ],
            [
              "Zip intake",
              "/api/upload_cs5_zip",
              "/api/v2/mk5/upload_cs5_zip",
              "Accepts zipped payloads, validates them, and audits access.",
            ],
            [
              "Device registration",
              "/api/opt-mpc/register",
              "/api/v2/optimizer/register",
              "Creates or refreshes device credentials via a downstream IoT service.",
            ],
            [
              "Autotune",
              "/api/autotune",
              "/api/v2/equalizer/autotune(+ /config)",
              "Calculates control suggestions and produces encrypted config payloads.",
            ],
          ]}
        />

        <H2>Versioning is the real product feature</H2>
        <P>
          The strongest architectural decision I made here is running two
          concurrent contracts. V1 keeps older flat URLs. V2 introduces more
          explicit controller-style paths under <Code>/api/v2</Code>. Both are
          mounted from the same app:
        </P>
        <Pre>{`# v1: preserve old URLs
app.include_router(upload_v1, prefix="/api")

# v2: expose clearer grouped URLs
app.include_router(upload_v2, prefix="/api/v2")`}</Pre>
        <P>
          If this were a browser-only frontend, I would be more tempted to force
          the migration. For desktop tools used in the field, that is riskier.
          Machines do not update instantly, and support teams hate breaking API
          changes that only reproduce on a customer laptop three versions behind.
          I built this codebase to treat backward compatibility as an
          engineering requirement, not as procrastination.
        </P>
        <P>
          The detail I am most pleased with is a small compatibility shim in the
          v1 upload-status endpoint. If an asynchronous upload is still{" "}
          <Code>pending</Code>, v1 rewrites that to <Code>success</Code> for
          compatibility with older deployed clients; v2 returns the honest
          status. It is slightly ugly and exactly the kind of ugliness that saves
          a support incident.
        </P>
        <Pre>{`if upload_status.status == "pending":
    upload_status = FileUploadStatus(
        status="success",
        detail=upload_status.detail,
    )`}</Pre>
        <Callout label="Compatibility beats elegance">
          I like this fix because it is specific. The service is not just
          &ldquo;versioned&rdquo; in the abstract; it carries a documented
          behavior difference for a real client expectation. That is what API
          versioning usually means in practice: preserving old mistakes long
          enough to move people safely.
        </Callout>

        <H2>The auth model is layered instead of uniform</H2>
        <P>
          I built three authentication surfaces into the configuration. There is
          a legacy setup for the older decryption API, a standard app
          registration for the main internal endpoints, and a separate
          product-facing registration for externally exposed
          verification/autotune flows. On top of that, authorization is
          role-based and endpoint-specific.
        </P>
        <P>
          I did not want to assume every caller is a human. Some endpoints are
          meant for user tokens, some allow service principals, and one of the
          upload guards explicitly distinguishes between the two:
        </P>
        <Pre>{`if upn is None:
    require_role("API.Mk5.Upload")   # app token
else:
    reject_guest_users()
    allow_only_internal_users()`}</Pre>
        <P>
          That is a good fit for desktop tooling. Interactive users exist, but so
          do unattended flows, service principals in CI, and machine-to-machine
          hops toward downstream services. I also had the service itself use
          client credentials when talking to external systems such as the
          registration service and an engineering data API, while keeping its
          own public endpoints protected with delegated or app-role checks.
        </P>
        <H2>Uploads are stateful, but the state is intentionally simple</H2>
        <P>
          I built the upload story from Azure primitives rather than a larger
          workflow engine. Files land in Blob Storage. Upload metadata and status
          live in Table Storage. FastAPI <Code>BackgroundTasks</Code> kick off
          the actual blob write after metadata is created, and clients poll for a
          UUID-backed status document.
        </P>
        <Pre>{`file_id = await store_metadata_file(...)
background_tasks.add_task(
    upload_file,
    file_id=file_id,
    file_data=file_data,
)
return file_id`}</Pre>
        <P>
          I like the clarity of that design. There is no queue service, no
          separate worker deployment, no orchestration framework. For moderate
          workloads, this is a perfectly rational tradeoff: enough state to be
          observable, not enough machinery to become its own project.
        </P>
        <P>
          The conversion endpoint is also interesting because it uses a compiled
          helper tool in the container image. The Dockerfile installs a vendor
          SDK, builds a C++ submodule, and then the Python app shells out to a
          transform script that emits multiple output files. The API is acting
          as a bridge between old file formats and newer cloud workflows rather
          than pretending everything is native JSON already.
        </P>

        <H2>The autotune path is where the real domain logic lives</H2>
        <P>
          The most substantial business logic sits in the autotune flow. One
          version of the endpoint accepts already-prepared compressor data and
          runs the control suggestion directly. The richer config endpoint does
          more: it takes serial numbers, calls one downstream system for product
          metadata, another for performance data, feeds the result into a domain
          library, converts the output to a device-specific binary format, and
          then encrypts the response before returning it.
        </P>
        <Pre>{`service_connect_product = service_connect.get_product(serial_number)
atr_data = atr.search_products(product, low_pressure, high_pressure)
flows = extract_flow(...)
suggestion = SuggestControlMode(compressor_data)
config_mk5 = to_mk5(..., suggestion)
encrypted_data = encrypt_response(config_mk5)`}</Pre>
        <P>
          That is the point in the service where &ldquo;API layer&rdquo; stops
          meaning CRUD and starts meaning translation between worlds. The
          desktop client thinks in serial numbers, controller IDs, and binary
          configuration blobs. The backend thinks in HTTP, downstream lookups,
          validation, and signed/encrypted responses. Cloud4crc exists to join
          those two shapes.
        </P>
        <P>
          The encryption step took more care than a typical CRUD API needs. The
          response is serialized, signed with RSA, wrapped with an AES session
          key, and the key material is itself protected with RSA before the
          whole payload is base64-encoded. The keys come from Key Vault, not from
          files on disk. That is exactly the kind of extra work I would expect in
          industrial software where configuration payloads may circulate outside
          a trusted web boundary.
        </P>

        <H2>Observability is built in, not bolted on later</H2>
        <P>
          I wired up OpenTelemetry for FastAPI and logging, exported traces and
          logs to Azure Monitor, and provisioned App Insights plus Log Analytics
          in infrastructure. Some endpoints also add span attributes for device
          IDs and machine lists, which matters because traces are only useful if
          they carry the domain identifiers I actually debug with.
        </P>
        <P>
          There is a second observability layer too: audit logging for the zip
          upload flow. That endpoint writes user, method, endpoint, file ID, and
          filename to a dedicated Table Storage table. I keep that separation on
          purpose. Technical telemetry answers &ldquo;what failed?&rdquo;; audit
          trails answer &ldquo;who did what?&rdquo;
        </P>

        <H2>The Azure footprint is broad but sensible</H2>
        <P>
          The infrastructure is all in Bicep. The main template provisions an
          App Service running a container image from ACR, a system-assigned
          managed identity, Key Vault integration, Blob containers for different
          upload types, Table Storage tables for metadata and audit logs, and the
          monitoring stack. The app service runs privately, uses managed identity
          to pull images and access storage, and gets its app settings injected at
          deploy time.
        </P>
        <P>
          That is a respectable middle ground. It is more disciplined than
          clicking resources together in a portal, but still approachable for a
          team that wants to operate one backend rather than build a full
          platform. The CI/CD shape matches that philosophy too: Azure DevOps
          builds a CI image first, reuses it for linting, unit tests and E2E
          tests, then promotes through dev, staging and prod in order.
        </P>
        <UL>
          <LI>
            <Em>Application:</Em> one FastAPI container, deployed to App Service.
          </LI>
          <LI>
            <Em>State:</Em> Blob Storage for files, Table Storage for metadata and
            audit records.
          </LI>
          <LI>
            <Em>Secrets and keys:</Em> Key Vault, with managed identity access.
          </LI>
          <LI>
            <Em>Telemetry:</Em> OpenTelemetry, Azure Monitor, App Insights, Log
            Analytics.
          </LI>
          <LI>
            <Em>Delivery:</Em> Azure DevOps YAML pipelines, Dockerized tests,
            environment promotion, and E2E coverage for both API versions.
          </LI>
        </UL>

        <H2>What I would change</H2>
        <P>
          The first thing I would revisit is background work running inside the
          web process. For the current scale it keeps the system small, but it
          does mean upload and conversion jobs are coupled to request-serving
          instances. If these files get bigger, or retries become important, I
          would split that into a queue-and-worker path while preserving the same
          polling contract.
        </P>
        <P>
          The second thing is the temporary-file story. The conversion flow still
          relies on local temp storage strongly enough that the app has a{" "}
          <Code>/api/clear-tmp</Code> maintenance endpoint. That is honest, but
          it is also a smell. I would rather make cleanup part of the job model
          than expose manual housekeeping on the API surface.
        </P>
        <P>
          Finally, v1 and v2 controllers are intentionally similar, but they do
          duplicate a lot of code. I would try to factor the shared behavior one
          layer deeper while keeping the external contracts exactly as they are.
          I chose safety over cleverness there, and I still think that was the
          right first decision.
        </P>

        <P>
          My main takeaway from building Cloud4crc is that mature backend
          engineering is often about handling awkward realities cleanly: desktop
          clients that lag, file formats that need native tooling, downstream
          systems with different auth models, and APIs that must evolve without
          pretending the old world disappeared. I designed this service around
          that reality, and I think it is stronger for it.
        </P>
      </article>
    </main>
  );
}
