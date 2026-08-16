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
  title: "Model Predictive Control - Yves De Boeck",
  description:
    "How I helped turn cloud-side model predictive control for industrial compressors into a production system: per-site forecasting, Databricks MLOps, firmware integration, and certificate-based device provisioning.",
  openGraph: {
    title: "Model Predictive Control",
    description:
      "Turning cloud-side model predictive control for industrial compressors into a production system.",
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
          MLOps · 14 min read
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.1] mb-6">
          Model Predictive Control
        </h1>
        <p className="text-lg text-slate-400 leading-relaxed mb-16">
          A cloud-side control stack for industrial compressors: demand
          forecasting, mixed-integer optimisation, Databricks model operations,
          firmware integration, and certificate-based device identity.
        </p>

        <P>
          This project looked like an optimiser from a distance and turned out
          to be five systems in a trench coat. The business problem was
          straightforward: industrial compressors consume a lot of energy, and a
          bad control strategy wastes it quietly. The engineering problem was
          harder: forecast near-future air demand, solve a control problem
          against real physical constraints, ship the result back to embedded
          devices quickly enough to matter, and do all of that without turning
          device onboarding into a security compromise.
        </P>
        <P>
          What I liked about this system is that the boundaries were honest.
          The firmware repo, the modelling repo, the Databricks repo, and the
          security services all had distinct responsibilities. What made it
          interesting was the seam between them: cloud latency versus control
          usefulness, retraining versus deployment safety, and security versus
          field-service ergonomics.
        </P>

        <H2>The control problem was physical before it was digital</H2>
        <P>
          The MPC code is solving a compressor-room problem, not a generic ML
          benchmark. Each unit has a flow/power curve, startup and shutdown
          costs, minimum running and stopping times, delayed second-stop
          constraints, availability flags, and current state. The air network is
          represented as a pressure state: produce more than demand and pressure
          rises; produce less and it falls.
        </P>
        <P>
          The optimiser in <Code>mpc_cloud.mpc.v1</Code> is written in CasADi
          and solved as a <Em>mixed-integer linear program</Em>. Binary variables
          represent load/on/start/stop decisions; continuous variables represent
          production and pressure. The objective combines operating power,
          unload power, start costs, and stop costs while keeping pressure
          inside the configured band.
        </P>
        <Pre>{`minimise  operating_power
        + unload_power
        + start_cost
        + stop_cost

subject to
  pressure[k+1] = pressure[k] + dt * (production[k] - demand[k]) / volume
  p_min <= pressure[k] <= p_max
  minimum_run_time / minimum_stop_time / DSS constraints
  compressor piecewise flow-power limits`}</Pre>
        <P>
          I set the forecast horizon in the production path to one hour ahead
          at five-minute steps. That is an important compromise. Shorter than
          that and the optimiser becomes reactive rather than predictive. Much
          longer and the forecast error matters more than the control logic.
        </P>

        <H2>Why this was really an MLOps system</H2>
        <P>
          MPC needs a demand forecast, and demand is the variable you do not get
          for free from physics. I built the modelling repo to support Prophet,
          NeuralProphet, a perfect forecast path for solver testing, and some
          older R&amp;D directions documented around clustering and LSTMs. The
          production path I settled on is per-site NeuralProphet.
        </P>
        <P>
          That per-site choice is not cosmetic. Compressor rooms are not
          interchangeable. Shift patterns, production schedules, weekend
          behaviour, and process load vary by site, so a single global model
          would mostly learn that industrial demand is messy. The training
          pipeline instead groups data by <Code>device_id</Code> and{" "}
          <Code>airnet_id</Code>, then trains one model per site.
        </P>
        <P>
          The preprocessing is sensible and practical: timestamps are sorted,
          duplicates are dropped, data is resampled to the controller cadence,
          gaps are interpolated, and the demand floor is shifted to zero before
          training. The floor is stored in model metadata and added back during
          inference. That is the kind of tiny detail that matters in production:
          if you skip it, the model can learn the baseline badly and all your
          forecasts become slightly wrong in exactly the boring way operators
          hate.
        </P>
        <Pre>{`df = df.drop_duplicates(subset=["ds"]).set_index("ds").sort_index()
df = df.resample("5min").mean().interpolate().reset_index()

floor = float(df["y"].min())
df["y"] -= floor`}</Pre>
        <P>
          The NeuralProphet training code adds a set of custom seasonalities
          tuned for this domain and logs <Code>mae</Code> and <Code>rmse</Code>{" "}
          to MLflow. The repo documentation is explicit that the data science
          team owns the model logic and the data engineering team owns the
          orchestration shell around it. I like that split. It keeps the real
          modelling logic in a testable Python package instead of burying it in
          notebooks.
        </P>

        <H2>The data path is built around traceability, not elegance</H2>
        <P>
          The runtime data path starts on the device. The firmware-side cloud
          manager listens to DDS paths configured per air network. When it sees
          a request-path message for a known airnet, it parses the raw JSON,
          adds <Code>airnet_id</Code> if needed, and sends the payload as IoT
          Hub telemetry.
        </P>
        <P>
          Downstream, the Databricks ingest notebook deliberately stores the
          full IoT Hub routing envelope as raw JSON in a bronze table. That is
          not glamorous, but it is the right kind of boring. Bronze is there to
          preserve the truth of what arrived, not to prove how much schema
          confidence you had on day one.
        </P>
        <P>
          Silver dbt models then parse the envelope, base64-decode the body, and
          split it into separate tables for consumption, operational state, and
          settings. Gold joins the relevant pieces into a feature table for
          training. The final feature set is intentionally lightweight:
        </P>
        <Table
          head={["feature", "why it exists"]}
          rows={[
            ["demand / pressure / power / flow", "primary physical signals"],
            ["1h / 6h / 24h rolling demand means", "short and medium-term context"],
            ["6h rolling demand std", "variability proxy"],
            ["hour_of_day / day_of_week / is_weekend", "seasonality anchors"],
            ["volume / load_level / setpoint / unload_level", "site configuration context"],
          ]}
        />
        <P>
          The system is modest about feature engineering, and I think that is a
          strength. It uses the warehouse for clean aggregation and the package
          for model-specific preprocessing. That boundary makes the whole stack
          easier to reason about.
        </P>

        <Callout label="A small safety feature I liked">
          New air networks are auto-provisioned into the settings tables with{" "}
          <Code>enable_control = false</Code>. That means telemetry can start
          flowing immediately, but control does not activate by accident. In an
          industrial setting, “discovered” and “allowed to actuate” should never
          be the same state.
        </Callout>

        <H2>The serving architecture is built for latency, not for purity</H2>
        <P>
          Once models are trained, they are registered in Unity Catalog as one
          model per site. A second Databricks notebook then discovers all{" "}
          <Code>mpc_site_*</Code> models, bundles their artifacts into a
          dispatcher model, and updates the <Code>mpc-predictions</Code> serving
          endpoint.
        </P>
        <P>
          The neat trick is that the dispatcher preloads the site models from
          local bundled artifacts instead of reaching back into the registry at
          serving time. The comments in the code explain why: the serving
          container does not have the workspace credentials needed to pull model
          artifacts from the registry on demand. So the deployment notebook pays
          the cost once up front and the endpoint starts with everything already
          beside it.
        </P>
        <Pre>{`POST /serving-endpoints/mpc-predictions/invocations
{
  "dataframe_records": [
    { "site_id": "device_001__airnet_001", "ds": "2026-07-29T10:00:00", "demand": 42.5 },
    { "site_id": "device_001__airnet_001", "ds": "2026-07-29T10:05:00", "demand": 42.5 }
  ]
}

=> { "predictions": [45.2, 46.1, ...] }`}</Pre>
        <P>
          That is not the most elegant architecture in an academic sense. It is
          the most reliable one in the actual platform constraints. The tradeoff
          is obvious: slower cold starts, lower per-request latency. For a
          control-adjacent service, that is a trade I would make every time.
        </P>

        <H2>The runtime loop is intentionally gated</H2>
        <P>
          The cloud runtime path itself lives in an Azure Function. For each IoT
          Hub message it decodes the payload, looks up per-airnet settings in a
          small Databricks app, calls the model-serving endpoint for the full
          forecast horizon, and then runs <Code>mpc_cloud.api.resolve()</Code>{" "}
          locally to compute the schedule that will be sent back to the
          controller as a direct method.
        </P>
        <P>
          The settings app is more interesting than it first appears. It keeps
          an in-memory cache of all known airnet settings so the function does
          not have to wait on a SQL warehouse for every message. On a cache
          miss, it does a single-row fallback query and then caches the result.
          On updates, it writes through immediately so there is no stale window.
          That is exactly the kind of latency engineering you only do when the
          caller is operational software instead of a dashboard.
        </P>
        <P>
          There is also an explicit safety gate: if the airnet is unknown, or if
          <Code>enable_control</Code> is false, the function returns early and
          never calls the forecast endpoint or the optimiser. Again: data can
          flow before control is allowed.
        </P>

        <H2>Firmware integration is where the cloud story becomes real</H2>
        <P>
          The firmware-side cloud manager is a modular C++ component with a DDS
          production bus and a fake bus for testing. The DDS app spins a polling
          thread every two seconds, reads raw messages from configured request
          paths, and only forwards telemetry for paths that belong to known
          airnets. When the cloud later invokes the <Code>mpc</Code> direct
          method, the payload is written back to the airnet&apos;s configured DDS
          reply path.
        </P>
        <P>
          That separation matters. The firmware is not “running the model”; it
          is acting as a bridge between the controller&apos;s native data bus and
          the cloud control service. The interesting design decision here is
          where the optimisation runs. Keeping the MILP in the cloud makes model
          rollout and retraining easier, but it means the round-trip must still
          be operationally useful. This system solves that by keeping the
          payloads narrow, the horizon short, and the runtime pipeline opinionated.
        </P>
        <UL>
          <LI>
            <Em>On-device:</Em> current state, recent consumption history, DDS
            integration, actuator path.
          </LI>
          <LI>
            <Em>In the cloud:</Em> forecast model, optimisation logic, per-site
            settings, rollout control, observability.
          </LI>
          <LI>
            <Em>Tradeoff:</Em> easier model operations, stricter latency budget.
          </LI>
        </UL>

        <H2>The device identity flow is much better than shipping shared secrets</H2>
        <P>
          The security side is a separate system, but it is tightly coupled to
          whether I would trust this in production. New devices are registered in
          IoT Hub with X.509 CA-signed identity. A temporary module identity is
          created with symmetric-key authentication and a short-lived,
          module-scoped SAS token. That token is only a bootstrap credential.
        </P>
        <P>
          On first secure setup, the device uses the SAS token to connect as the
          temporary module, generates a CSR locally from its own private key,
          sends that CSR upstream, receives the signed certificate via direct
          method, stores it, and reconnects using X.509. After that, the
          provisioning module can be deleted.
        </P>
        <Pre>{`temporary SAS module -> send CSR -> certificate signing service
                      -> direct method CsrResponse -> device stores cert
                      -> reconnect with X.509 -> delete temporary module`}</Pre>
        <P>
          I like this flow because it keeps the private key on the device and
          makes the symmetric secret explicitly temporary. The registration
          service also tracks lifecycle state in a database and has a cleanup job
          that asks the device whether it is secure before removing the
          provisioning module. That is a practical answer to a real field problem:
          you need a bootstrap path, but you do not want bootstrap credentials to
          become permanent by inertia.
        </P>

        <H2>The certificate service has the right kind of persistence</H2>
        <P>
          The certificate-signing service validates the CSR subject, validates
          that the device exists in the expected IoT Hub, signs the request
          either with a Key Vault-backed CA or through Active Directory
          Certificate Services, stores certificate metadata, and returns the full
          PEM chain through the <Code>CsrResponse</Code> direct method.
        </P>
        <P>
          One implementation detail I am glad I got right: when a new
          certificate is stored, previous thumbprint mappings for that device
          are deleted and replaced. That gives a clean “current certificate for
          this device” view while still storing the issued certificate artifact
          in blob storage. It is not full PKI lifecycle management, but it is
          enough to support certificate refresh without letting old
          thumbprints pile up as if they were all still active.
        </P>
        <Callout label="What is still missing">
          I built request logging, inference tables, MLflow metrics, schema
          checks, and explicit deployment orchestration. I have <Em>not</Em>{" "}
          built a production-grade automated drift detector or
          champion/challenger retraining policy yet. The monitoring story is
          solid for observability, but still lighter than the control and
          security story.
        </Callout>

        <H2>What I would change next</H2>
        <P>
          The first change would be tighter model-performance monitoring. The
          serving endpoint already logs requests and responses into inference
          tables, and training already logs per-site MAE/RMSE. The missing layer
          is joining those two worlds into an actual operational monitor:
          per-site error over time, stale-model detection, and a controlled
          retraining trigger instead of a weekly blind rerun.
        </P>
        <P>
          The second change would be an explicit degraded-mode strategy for the
          function path. Right now the runtime design is clear and clean, but the
          architectural question remains the same in every cloud control system:
          what exactly happens if the forecast endpoint is slow, unavailable, or
          returns no model for a newly onboarded site? The code handles unknown
          sites by failing safely, which is good, but I would want the fallback
          policy written down as a first-class operating mode rather than as an
          implementation side effect.
        </P>
        <P>
          The third change would be to make certificate renewal more visible as
          an operational workflow. The pieces are there for signed identity and
          certificate replacement, but renewal cadence, observability, and alarm
          thresholds deserve the same product-level clarity as the initial
          provisioning flow.
        </P>

        <H2>The stack</H2>
        <UL>
          <LI>
            <Em>Firmware bridge:</Em> C++, DDS, IoT Hub direct methods, X.509
            authentication.
          </LI>
          <LI>
            <Em>Optimisation:</Em> CasADi + HiGHS MILP, one-hour horizon, five-minute steps.
          </LI>
          <LI>
            <Em>Forecasting:</Em> NeuralProphet per site, MLflow logging, Unity
            Catalog model registry.
          </LI>
          <LI>
            <Em>Data platform:</Em> Databricks, Auto Loader, dbt, Delta, Unity
            Catalog, Model Serving.
          </LI>
          <LI>
            <Em>Runtime:</Em> Azure Function calling serving endpoint, then
            resolving MPC and returning schedules to devices.
          </LI>
          <LI>
            <Em>Security:</Em> IoT Hub registration service, CSR signing
            service, short-lived SAS bootstrap, mTLS device identity.
          </LI>
        </UL>
        <P>
          The best thing about this project is that I treated the optimiser as
          necessary but not sufficient. Real industrial ML systems live or die on
          everything around the model: latency, rollout control, data contracts,
          device identity, and safe defaults. I built it with that lesson in
          mind from the start.
        </P>
      </article>
    </main>
  );
}
