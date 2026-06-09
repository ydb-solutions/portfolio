export const profile = {
  name: "Yves De Boeck",
  title: "Data & AI Engineer",
  tagline:
    "Building production-grade data platforms, cloud infrastructure, and AI systems that solve real industrial problems.",
  location: "Belgium",
  relocating: ["Toronto", "Zurich", "Australia"],
  email: "yves.deboeck@ydb-solutions.com",
  github: "https://github.com/ydb-solutions",
  linkedin: "https://www.linkedin.com/in/yves-de-boeck",
  education: {
    degree: "MSc Computer Science Engineering (magna cum laude)",
    institution: "University of Antwerp",
    note: "Offered a PhD in AI/simulation for autonomous vehicles — chose industry to solve real-world problems.",
  },
};

export const experiences = [
  {
    company: "Atlas Copco",
    role: "Data & AI / Full Stack / Cloud Engineer",
    period: "Jan 2024 – Present",
    location: "Belgium",
    highlights: [
      "Designed and built a cloud-native IoT fleet management platform on Azure, ingesting real-time telemetry from industrial compressors worldwide via MQTT and IoT Hub, streamed live to the frontend via WebSockets.",
      "Wrote the embedded C++ component on a custom Yocto OS for compressor controllers, bridging the internal MQTT bus with the Azure IoT Hub.",
      "Built and maintained production APIs consumed by field service technicians on customer sites.",
      "Set up a Databricks data platform from scratch: medallion architecture, PySpark, dbt, Delta Lake, Unity Catalog, DLT — ingesting SQL, JSON, XML, Kafka, and text sources in batch and streaming.",
      "Developed a RAG-based internal knowledge app using Azure AI Search and Prompt Flow, deployed across multiple departments with per-department document indexes.",
      "Created an agentic AI assistant (similar to OpenClaw) using Azure Agent Framework (Semantic Kernel) and Azure AI Foundry, integrated with Slack — handling ticket management, PR reviews, security assessments, and CI/pipeline status reports.",
      "Built an agentic security scanner published as an Azure DevOps task: auto-detects stack, runs scanners, triages findings, fixes code in an agentic loop, and auto-generates a PR for final fixes.",
      "Full IaC with Bicep and Terraform across all projects; CI/CD with Azure DevOps and Jenkins.",
    ],
    tech: [
      "Python",
      "FastAPI",
      "React",
      "C++",
      "Yocto",
      "Databricks",
      "PySpark",
      "dbt",
      "Delta Lake",
      "Azure",
      "Bicep",
      "Terraform",
      "Azure DevOps",
      "Jenkins",
      "Docker",
      "MLflow",
      "Semantic Kernel",
      "Azure AI Foundry",
      "RAG",
      "MQTT",
      "IoT Hub",
    ],
  },
  {
    company: "TrinetX",
    role: "Software Engineer",
    period: "Sep 2021 – Dec 2023",
    location: "Ghent, Belgium",
    highlights: [
      "Full-stack development on a large-scale healthcare analytics platform (Java/Spring + React) used by hospital networks worldwide.",
      "Built ETL services in Python processing healthcare data across Vertica, Snowflake, Redis, and MongoDB.",
      "Designed and built a new observability service for ETL processes from scratch, including architecture decisions, CI/CD setup, and AWS cloud deployment.",
      "Operated in a strict TDD, SOLID, domain-driven design environment with Jenkins and GitLab CI.",
    ],
    tech: [
      "Java",
      "Spring Boot",
      "React",
      "Python",
      "Databricks",
      "Snowflake",
      "Vertica",
      "Redis",
      "MongoDB",
      "AWS",
      "Kubernetes",
      "Terraform",
      "Jenkins",
      "GitLab CI",
    ],
  },
  {
    company: "Essent",
    role: "AM Software Engineer – Billing Processes",
    period: "2020 – Sep 2021",
    location: "Belgium",
    highlights: [
      "Analysed and resolved issues across Java, PHP, and Python applications in a custom SAP billing ecosystem.",
      "Wrote complex PostgreSQL and MySQL queries to debug and fix billing logic, sharpening deep SQL expertise.",
    ],
    tech: ["Java", "PHP", "Python", "PostgreSQL", "MySQL", "AWS", "SOAP"],
  },
];

export const projects = [
  {
    name: "OpenClaw",
    description:
      "A personal AI assistant for my development workflow. Persistent memory with semantic search, tool use, and a clean web UI. Inspired the agentic assistant I later built at Atlas Copco.",
    tags: ["AI Agents", "Python", "React", "TypeScript"],
    github: "https://github.com/ydb-solutions/openclaw",
    featured: true,
  },
  {
    name: "Lens",
    description:
      "Stock intelligence platform that evaluates companies through the lens of legendary investors (Graham, Buffett, Lynch, O'Neil, Dividend). Radar chart visualisation with per-profile deep-dive dashboards.",
    tags: ["Python", "React", "GCP", "GitHub Actions", "Finance"],
    github: "https://github.com/ydb-solutions/lens",
    featured: true,
  },
  {
    name: "Memry",
    description:
      "Turns PDFs into structured study material: summaries, Q&A flashcards, and spaced-repetition review powered by AI.",
    tags: ["Python", "React", "GCP", "GitHub Actions", "AI/ML"],
    github: "https://github.com/ydb-solutions/memry",
    featured: true,
  },
  {
    name: "Finance App",
    description:
      "Personal finance tracking and analysis app with expense categorisation, investment tracking, and visualisations.",
    tags: ["Python", "React", "GCP"],
    github: "https://github.com/ydb-solutions/finance_app",
    featured: false,
  },
  {
    name: "IoT Fleet Management Platform",
    description:
      "End-to-end cloud platform for monitoring and controlling a global fleet of industrial compressors. Real-time telemetry via MQTT → IoT Hub → WebSockets → live dashboards. Remote commands, firmware updates, and embedded C++ on Yocto.",
    tags: ["Azure", "Python", "React", "C++", "Yocto", "MQTT", "IoT Hub"],
    github: null,
    featured: true,
    professional: true,
  },
  {
    name: "Agentic Security Scanner",
    description:
      "Azure DevOps task that auto-detects the stack, runs security scanners, triages findings with an LLM agent, then enters an agentic fix-validate loop until everything passes and auto-generates a PR.",
    tags: ["Python", "Azure AI Foundry", "Semantic Kernel", "Azure DevOps"],
    github: null,
    featured: true,
    professional: true,
  },
  {
    name: "RAG Knowledge Assistant",
    description:
      "Deployed multiple instances of an internal knowledge app across Atlas Copco departments, each with a custom Azure AI Search index over their documents. Built with Prompt Flow for orchestration and evaluation.",
    tags: ["Python", "Azure AI Search", "Prompt Flow", "RAG", "Azure"],
    github: null,
    featured: false,
    professional: true,
  },
  {
    name: "Databricks Data Platform",
    description:
      "Built a production data platform from scratch using the medallion architecture — PySpark, dbt, Delta Lake, Unity Catalog, DLT — ingesting SQL, JSON, XML, Kafka, and text in batch and streaming modes.",
    tags: ["Databricks", "PySpark", "dbt", "Delta Lake", "Azure", "Kafka"],
    github: null,
    featured: false,
    professional: true,
  },
];

export const skillGroups = [
  {
    category: "Languages",
    skills: ["Python", "SQL", "Java", "C++", "JavaScript / TypeScript", "Bash"],
  },
  {
    category: "Data Engineering",
    skills: [
      "Databricks",
      "Apache Spark / PySpark",
      "Delta Lake",
      "dbt",
      "Azure Data Factory",
      "Azure Data Explorer",
      "Kafka",
      "ETL/ELT (Batch & Streaming)",
      "Unity Catalog",
      "Snowflake",
    ],
  },
  {
    category: "AI / ML",
    skills: [
      "RAG Architecture",
      "LLM Agents",
      "Vector Databases",
      "MLflow",
      "Azure AI Foundry",
      "Semantic Kernel",
      "Prompt Flow",
      "NeuralProphet",
    ],
  },
  {
    category: "Cloud & Infrastructure",
    skills: [
      "Azure (Expert)",
      "GCP",
      "AWS",
      "Docker",
      "Kubernetes",
      "Terraform",
      "Bicep",
      "Azure DevOps",
      "Jenkins",
      "IoT Hub",
    ],
  },
  {
    category: "Backend",
    skills: [
      "FastAPI",
      "Spring Boot",
      "Node.js",
      "PostgreSQL",
      "CosmosDB",
      "SQLAlchemy",
      "REST / WebSockets",
      "MQTT",
    ],
  },
  {
    category: "Frontend",
    skills: ["React", "Next.js", "TypeScript", "Tailwind CSS"],
  },
];

export const certifications = [
  {
    name: "Databricks Data Engineering Professional",
    issuer: "Databricks",
    tier: "professional",
  },
  {
    name: "Databricks Data Engineering Associate",
    issuer: "Databricks",
    tier: "associate",
  },
  {
    name: "Azure Data Engineer Associate (DP-203)",
    issuer: "Microsoft",
    tier: "associate",
  },
  {
    name: "Azure AI Engineer Associate (AI-102)",
    issuer: "Microsoft",
    tier: "associate",
  },
  {
    name: "AWS Solutions Architect",
    issuer: "Amazon",
    tier: "associate",
  },
  {
    name: "Professional Scrum Master",
    issuer: "Scrum.org",
    tier: "professional",
  },
  {
    name: "Oracle Java SE 8 Professional",
    issuer: "Oracle",
    tier: "professional",
  },
  {
    name: "Certified Associate in Python",
    issuer: "Python Institute",
    tier: "associate",
  },
  {
    name: "Azure Fundamentals (AZ-900)",
    issuer: "Microsoft",
    tier: "fundamentals",
  },
  {
    name: "Azure Data Fundamentals (DP-900)",
    issuer: "Microsoft",
    tier: "fundamentals",
  },
  {
    name: "Azure AI Fundamentals (AI-900)",
    issuer: "Microsoft",
    tier: "fundamentals",
  },
];
