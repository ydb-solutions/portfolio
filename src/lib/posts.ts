export interface Post {
  slug: string;
  title: string;
  blurb: string;
  date: string;
  readingTime: string;
  tags: string[];
}

export const posts: Post[] = [
  {
    slug: "openclaw",
    title: "OpenClaw: the assistant I actually run",
    blurb:
      "A technical write-up of the personal assistant I run on a GCP VM: one long-lived gateway, file-backed state, SQLite memory indexes, Telegram delivery, cron-driven automations, and the operational tradeoffs that only show up in production.",
    date: "2026-08-12",
    readingTime: "14 min",
    tags: ["AI Agents", "TypeScript", "Docker", "GCP", "Automation"],
  },
  {
    slug: "every-fire-on-earth",
    title: "Every fire on Earth, every morning",
    blurb:
      "Building a global thermal-anomaly pipeline on Databricks Free Edition: NASA FIRMS, H3 hexagons, the 7% bug I nearly shipped, and why the public demo has no backend at all.",
    date: "2026-08-15",
    readingTime: "20 min",
    tags: ["Databricks", "dbt", "H3", "Geospatial", "Data Engineering"],
  },
  {
    slug: "opencloud",
    title: "OpenCloud: a team assistant with memory and guardrails",
    blurb:
      "A technical write-up of an internal Slack and Teams assistant built around MCP sidecars, persistent team memory, and explicit safety controls. More runtime than chatbot, with real deployment, evaluation, and governance concerns.",
    date: "2026-08-08",
    readingTime: "12 min",
    tags: ["AI Agents", "Azure", "MCP", "Slack", "Microsoft Teams"],
  },
  {
    slug: "lens",
    title: "Five investors, one stock engine",
    blurb:
      "Lens scores the same company through five investing philosophies instead of pretending there is one universal definition of a \u201cgood stock\u201d. The interesting work was not the radar chart - it was taming messy financial APIs, explicit heuristics, and a cheap but disciplined GCP deployment.",
    date: "2026-08-07",
    readingTime: "11 min",
    tags: ["FastAPI", "React", "PostgreSQL", "GCP", "Finance"],
  },
  {
    slug: "memry",
    title: "Memry: turning books into study material, with all the messy bits left in",
    blurb:
      "I built Memry to turn PDFs and EPUBs into summaries, flashcards, and spaced-repetition review. The interesting part was not the AI demo - it was dealing honestly with lossy PDF extraction, token limits, provider differences, and the parts of the pipeline that quietly degrade quality.",
    date: "2026-07-29",
    readingTime: "11 min",
    tags: ["AI Engineering", "FastAPI", "React Native", "GCP", "LLM Systems"],
  },
  {
    slug: "model-predictive-control",
    title: "Model Predictive Control",
    blurb:
      "How I helped turn cloud-side model predictive control for industrial compressors into a production system: per-site forecasting, Databricks MLOps, firmware integration, and certificate-based device provisioning. The hard parts were latency, deployment safety, and identity - not just the optimiser itself.",
    date: "2026-07-29",
    readingTime: "14 min",
    tags: ["MLOps", "Databricks", "IoT", "Time Series", "C++", "Azure"],
  },
  {
    slug: "agentic-security-scanner",
    title: "A security scanner that files its own pull requests",
    blurb:
      "How I built an Azure DevOps task that detects the stack, runs multiple scanners, uses an LLM to triage the noise, and opens remediation PRs with guardrails. The interesting part was deciding where automation should stop.",
    date: "2026-07-29",
    readingTime: "14 min",
    tags: ["Azure DevOps", "Security", "LLM Agents", "Python", "DevSecOps"],
  },
  {
    slug: "cloud4crc",
    title: "Cloud4crc: a modular monolith for desktop tools",
    blurb:
      "A FastAPI platform for technician desktop tools, built as a modular monolith with dual API contracts, layered Azure AD auth, and Azure-native delivery. The interesting part is how much of the design is shaped by backward compatibility and operational reality rather than fashion.",
    date: "2026-07-29",
    readingTime: "11 min",
    tags: ["FastAPI", "Azure", "API Design", "Backwards Compatibility"],
  },
  {
    slug: "iot-fleet-management-platform",
    title: "Building an IoT fleet management platform",
    blurb:
      "How I built an end-to-end platform for monitoring and controlling industrial compressors worldwide - from embedded C++ on Yocto Linux to live dashboards, firmware rollout flows, and telemetry pipelines.",
    date: "2026-07-28",
    readingTime: "20 min",
    tags: ["Azure", "IoT", "C++", "Yocto", "FastAPI", "Databricks"],
  },
  {
    slug: "rag-knowledge-assistant",
    title: "Building a multi-tenant RAG knowledge assistant",
    blurb:
      "I built and deployed several internal knowledge assistants for different engineering groups at a large industrial company. The interesting work was not the chat UI - it was making retrieval, isolation, grounding, and operations hold up across very different document sets.",
    date: "2026-07-22",
    readingTime: "11 min",
    tags: ["Applied AI", "RAG", "Azure AI Search", "Prompt Flow", "Enterprise Search"],
  },
  {
    slug: "databricks-data-platform",
    title: "Building a Databricks data platform that could survive reality",
    blurb:
      "How I built a production Databricks lakehouse for mixed batch and streaming sources without letting each source invent its own architecture. The interesting work was not the tooling itself, but the boundaries between bronze, silver, gold, and governance.",
    date: "2026-07-22",
    readingTime: "13 min",
    tags: ["Databricks", "Data Engineering", "dbt", "Delta Lake", "Streaming"],
  },
  {
    slug: "finance-app",
    title: "My finance app starts with a bank statement",
    blurb:
      "A local-first finance tracker built around PDF and Excel imports, GPT-assisted transaction extraction, and a deliberately simple categorisation loop. The interesting part is not the charts but the ingestion boundary: turning messy bank exports into something I can trust and correct over time.",
    date: "2026-07-09",
    readingTime: "9 min",
    tags: ["FastAPI", "LLMs", "Personal Finance", "Data Modelling"],
  },
];
