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
  title: "Five investors, one stock engine — Yves De Boeck",
  description:
    "Building Lens: a stock intelligence platform that scores companies through five investor frameworks, from Graham to O'Neil.",
  openGraph: {
    title: "Five investors, one stock engine",
    description:
      "Building Lens: a stock intelligence platform that scores companies through five investor frameworks.",
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
          Full-stack engineering · 11 min read
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.1] mb-6">
          Five investors, one stock engine
        </h1>
        <p className="text-lg text-slate-400 leading-relaxed mb-16">
          Lens is my attempt to turn five very different investing philosophies
          into one coherent product: a FastAPI backend, a React dashboard, and a
          scoring engine that is honest about where the math is crisp and where
          the data absolutely is not.
        </p>

        <P>
          I built Lens because most retail stock tools flatten everything into one
          leaderboard. That is useful if you want a screener. It is less useful if
          you care about <Em>why</Em> a company looks attractive. A cheap cyclical,
          a Buffett-style compounder, and a high-momentum breakout can all be good
          ideas for completely different reasons.
        </P>
        <P>
          So the product premise became: score the same stock through five lenses
          — Graham, Buffett, Lynch, O&apos;Neil, and Dividend — then show the result
          as a radar chart and a per-profile metric breakdown. The repo is split
          cleanly: <Code>frontend/</Code> is a Vite + React + TypeScript app,
          <Code>backend/</Code> is a FastAPI service with a light hexagonal
          architecture, and <Code>terraform/</Code> plus GitHub Actions deploy the
          whole thing onto GCP.
        </P>

        <H2>The architecture is smaller than it looks</H2>
        <P>
          The backend is opinionated but not overbuilt. The domain model lives in
          <Code>backend/app/domain/entities/__init__.py</Code>; the ports sit in
          <Code>domain/ports</Code>; the concrete adapters talk to Alpha Vantage,
          Polygon.io and PostgreSQL. The main orchestration happens in
          <Code>StockAnalysisService</Code>, which does exactly three things:
          check the cache, fetch fresh data if needed, and compute the five
          profile scores.
        </P>
        <Pre>{`cached = await self._repo.get_analysis(ticker)
if cached and self._is_fresh(cached):
    return cached

(overview, fundamentals), market_data = await _gather(
    self._fundamentals.get_overview_and_fundamentals(ticker),
    self._market.get_quote(ticker),
)

profile_scores = [
    compute_profile_score(pt, fundamentals, market_data)
    for pt in InvestorProfileType
]`}</Pre>
        <P>
          That <Code>_gather()</Code> call matters. Fundamentals come from Alpha
          Vantage, market data comes from Polygon, and they are fetched in
          parallel. The service then persists the resulting analysis in Postgres
          with a 24-hour TTL. That cache is not a micro-optimisation; it is the
          thing that makes the product economically viable when one of the
          upstream providers has an aggressively small free tier.
        </P>
        <P>
          I also like the repository choice. Instead of normalising every metric,
          score and nested explanation into ten tables, Lens stores each analysis
          as a JSONB payload in <Code>stock_analyses</Code>. That keeps writes
          simple while still letting me rank by profile using a JSONB path query.
        </P>
        <Pre>{`SELECT * FROM stock_analyses
ORDER BY (
    SELECT elem->>'total_score'
    FROM jsonb_array_elements(payload->'profile_scores') AS elem
    WHERE elem->>'profile_type' = :profile_type
    LIMIT 1
)::float DESC NULLS LAST`}</Pre>
        <P>
          The tradeoff is obvious: JSONB is flexible, but it is not a great fit if
          I ever want serious historical analytics. For the current product shape
          — one latest snapshot per ticker — it is the right kind of laziness.
        </P>

        <H2>Financial APIs are messy in boring ways</H2>
        <P>
          The most realistic part of the repo is not the radar chart. It is all
          the small defensive code around data quality. Alpha Vantage returns a
          lot of values as strings, sometimes percentages mean 15.5%, sometimes
          they mean 0.155, and some ratios are simply absent. So the adapter in
          <Code>alpha_vantage_client.py</Code> spends a surprising amount of time
          coercing, normalising and deriving secondary metrics.
        </P>
        <Pre>{`def _pct_field_to_decimal(value):
    v = _f(value)
    if v is None:
        return None
    if v > 1.0:
        return v / 100.0
    return v


def _payout_ratio_resolved(overview):
    pr = _pct_field_to_decimal(overview.get("PayoutRatio"))
    if pr is not None:
        return pr
    dps = _f(overview.get("DividendPerShare"))
    eps = _f(overview.get("EPS")) or _f(overview.get("DilutedEPS"))
    if dps is not None and eps is not None and eps != 0:
        return abs(dps / eps)`}</Pre>
        <P>
          A few examples: debt-to-equity can come from the overview endpoint or be
          reconstructed from the balance sheet; earnings stability is inferred by
          walking up to five annual income statements; free cash flow is derived as
          operating cash flow minus capex; dividend growth is approximated from
          cash-flow statements. None of this is glamorous, but this is where a lot
          of finance side projects quietly fail.
        </P>
        <Callout label="The gotcha I would document first now">
          Lens has a field named <Code>roic</Code>, but today it is populated from
          Alpha Vantage&apos;s <Code>ReturnOnAssetsTTM</Code> as a proxy because the
          provider does not expose a clean ROIC metric. That is defensible for a
          prototype and not defensible enough for a serious investment product.
          The code is honest about it; the UI should be too.
        </Callout>
        <P>
          The repo is also explicit about rate limits. Alpha Vantage free tier
          errors are detected by inspecting the response body for <Code>Note</Code>
          or <Code>Information</Code>, then converted into a clear 429-style user
          message. Polygon search does the same for invalid or under-scoped API
          keys. The result is not perfect resilience, but it does at least fail
          loudly and specifically instead of returning a quietly broken score.
        </P>

        <H2>The scoring engine is opinionated, not predictive</H2>
        <P>
          The scoring logic in <Code>backend/app/services/scoring.py</Code> is the
          core of the project. Each profile is a list of weighted metric scorers.
          A scorer produces a <Code>MetricResult</Code>; the weighted sum becomes a
          <Code>ProfileScore</Code>; the grade is mapped with simple thresholds
          from A through F.
        </P>
        <Table
          head={["profile", "what it rewards", "signature constraint"]}
          rows={[
            ["Value", "cheap assets and balance-sheet safety", "P/E < 15, P/B < 1.5"],
            ["Quality", "high capital returns and margins", "ROE > 15%, strong FCF"],
            ["GARP", "growth without paying too much", "PEG < 1.0"],
            ["Momentum", "fundamentals plus price strength", "RS ≥ 70, volume surge"],
            ["Dividend", "income that looks sustainable", "yield band, payout discipline"],
          ]}
        />
        <P>
          Two helper functions do most of the work: <Code>_ratio_score()</Code>
          compares a value to a target, and <Code>_range_score()</Code> rewards
          landing inside a preferred band. That gives the system a nice property:
          metrics degrade smoothly instead of flipping from 100 to 0 at a single
          cutoff.
        </P>
        <Pre>{`_make_scorer(
    "dividend_yield", "Dividend Yield", "2% – 6%", 0.25,
    "The 2–6% band is often attractive without usually signalling distress.",
    lambda f, m: (
        f.dividend_yield,
        0.02 <= (f.dividend_yield or 0) <= 0.06,
        _range_score(f.dividend_yield, 0.02, 0.06),
    ),
)`}</Pre>
        <P>
          I like this because it keeps the engine interpretable. If a stock gets a
          weak Dividend score, I can point to the exact failing metrics. The
          frontend reinforces that by showing every metric, its benchmark, whether
          it passed, and a tooltip explaining why that metric matters.
        </P>
        <P>
          The honest downside is that this is a hand-built heuristic model, not a
          backtested alpha signal. The weights are understandable, which is good.
          They are also subjective, which is unavoidable. Lens is closer to a
          structured checklist than a prediction engine, and I think that is a
          healthier promise to make.
        </P>

        <H2>Momentum was the least pure profile</H2>
        <P>
          Graham, Buffett, Lynch and Dividend mostly live on accounting and cash
          flow. O&apos;Neil does not. The Momentum profile needs recent price action,
          relative strength and abnormal volume, so the Polygon adapter computes a
          rough 52-week relative-strength score by comparing a ticker&apos;s 52-week
          change to SPY and mapping that spread onto a 0-100 scale.
        </P>
        <Pre>{`ticker_perf, spy_perf = await asyncio.gather(
    self._get_52w_change(ticker),
    self._get_52w_change("SPY"),
)

if ticker_perf is None or spy_perf is None:
    return None

diff = ticker_perf - spy_perf
rs = 50 + (diff * 100)   # rough mapping; refine with universe data`}</Pre>
        <P>
          The comment in the code says what needs saying: this is a rough mapping.
          A real relative-strength percentile should be computed against a broad
          universe, not one ETF. The current implementation is directionally
          useful — it tells me whether a stock is materially outperforming the
          market — but it is not a faithful reproduction of institutional RS.
        </P>
        <P>
          The same is true for volume. Lens compares current volume with the
          trailing 30-day average and awards points if it is at least 40% above
          that baseline. Reasonable? Yes. Deeply nuanced? No. For a personal
          product, this is a good example of where to stop: accurate enough to be
          informative, still simple enough to explain on one screen.
        </P>

        <H2>The frontend is a workbench, not a brochure</H2>
        <P>
          The frontend is where the project becomes more than a scoring script.
          The dashboard combines <Code>StockSearch</Code>, <Code>StockHeader</Code>,
          a Recharts radar visual in <Code>ProfileRadarChart.tsx</Code>, and a
          tab-like deep dive in <Code>ProfileDashboard.tsx</Code>. The search box
          is backed by TanStack Query, the auth token lives in a persisted Zustand
          store, and Axios injects the JWT into every request via an interceptor.
        </P>
        <P>
          One design choice I like is that the metrics table does not just show
          numbers. It shows benchmark, pass/fail state, and an info tooltip for
          every row. That makes the product usable by someone who does not already
          know what FCF coverage or PEG means.
        </P>
        <P>
          There is also an optional AI layer. If <Code>GEMINI_API_KEY</Code> is
          configured, the dashboard exposes an <Code>AI Analyze</Code> button. The
          backend formats the existing analysis into a prompt and asks
          <Code>gemini-2.5-flash-lite</Code> for a short narrative. I like that the
          AI output is downstream of the deterministic scoring engine rather than a
          replacement for it.
        </P>
        <P>
          The most interesting product compromise is in <Code>ProfileLabPage</Code>.
          The “top stocks” view only ranks companies that have already been looked
          up and cached. The UI even says so: search for a ticker on the dashboard
          to populate the cache. That is a sensible shortcut for an MVP, but it
          means Lens is not yet a true market-wide screener. Right now the cache is
          doubling as the dataset.
        </P>

        <H2>Deploying it on GCP was mostly IAM and packaging</H2>
        <P>
          The deployment story is more mature than I expected for a personal
          project. The backend and frontend are both multi-stage Docker builds. The
          frontend compiles to static assets served by Nginx; the backend runs
          Uvicorn with two workers. GitHub Actions builds both images, pushes them
          to Artifact Registry, then runs Terraform.
        </P>
        <P>
          Infrastructure-wise, Lens uses Cloud Run for both services, Cloud SQL
          for Postgres, and Workload Identity Federation so GitHub can authenticate
          to GCP without a long-lived service-account key. The backend connects to
          Cloud SQL through the Cloud Run mounted <Code>/cloudsql</Code> socket,
          while the Terraform module keeps the Cloud Run services at zero minimum
          instances to avoid idle cost.
        </P>
        <Pre>{`env_vars = {
  DATABASE_URL = "postgresql+asyncpg://lens:\${var.db_password}@/lens?host=/cloudsql/\${module.cloud_sql.connection_name}"
  CORS_ORIGINS = module.frontend.url
  USE_MOCK_DATA = "false"
}`}</Pre>
        <P>
          Two comments in the infra code tell the real story. First: there is a
          note about <Code>allUsers</Code> access and an organisation policy around
          <Code>iam.allowedPolicyMemberDomains</Code>. Second: the reusable deploy
          workflow has a specific step to clear Cloud SQL deletion protection
          before Terraform replacements. That is exactly the kind of operational
          scar tissue I trust more than a README diagram.
        </P>
        <H3>A nice little deployment detail</H3>
        <P>
          The frontend build tries to discover the current backend Cloud Run URL at
          deploy time and injects it as <Code>VITE_API_URL</Code>. If the backend
          does not exist yet, the workflow warns and builds without it. That is a
          small thing, but it avoids hard-coding environment URLs in the frontend
          repo and keeps the pipeline largely self-bootstrapping.
        </P>

        <H2>What I would change</H2>
        <P>
          The first thing I would change is the data model. Today Lens stores one
          latest analysis per ticker. That is enough for a dashboard, but it throws
          away history. I cannot ask how a company&apos;s Buffett score evolved over
          time, or whether a Momentum signal preceded a drawdown, because there is
          no time series behind the snapshot.
        </P>
        <P>
          The second change would be a proper universe-ingestion pipeline. The
          current design only analyses stocks users explicitly search for. That is
          fine for keeping API costs contained, and honestly probably the right
          first constraint, but it means the “top by profile” endpoint is really
          “top among whatever happened to be cached recently”. A scheduled batch
          pipeline with watchlists, quotas and freshness policies would make the
          product much more truthful.
        </P>
        <P>
          Third: I would tighten the semantics of the metrics. <Code>roic</Code>
          should be real ROIC, relative strength should be universe-based, and the
          UI should expose which fields are directly provider-sourced versus
          derived. Financial software earns trust by being explicit about its
          approximations, not by hiding them.
        </P>

        <H2>The stack</H2>
        <UL>
          <LI>
            <Em>Frontend:</Em> React 18, Vite, TypeScript, Tailwind, Recharts,
            TanStack Query, Zustand.
          </LI>
          <LI>
            <Em>Backend:</Em> FastAPI, SQLModel, async SQLAlchemy, httpx, JWT auth,
            optional Gemini analysis.
          </LI>
          <LI>
            <Em>Data sources:</Em> Alpha Vantage for fundamentals, Polygon.io for
            quotes, search, volume and relative-strength inputs.
          </LI>
          <LI>
            <Em>Database:</Em> PostgreSQL on Cloud SQL, with stock analyses stored
            as JSONB snapshots.
          </LI>
          <LI>
            <Em>Infrastructure:</Em> Terraform, Cloud Run, Artifact Registry,
            Workload Identity Federation, GitHub Actions CI/CD.
          </LI>
        </UL>
        <P>
          Lens is not trying to be Bloomberg in miniature. It is a deliberately
          constrained product: one stock, five philosophies, transparent scoring,
          and just enough infrastructure discipline that I can trust it when I come
          back to it in six months.
        </P>
      </article>
    </main>
  );
}
