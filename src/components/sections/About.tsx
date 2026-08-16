"use client";

import { motion } from "framer-motion";
import { Cpu, Database, Brain } from "lucide-react";

const pillars = [
  {
    icon: <Cpu size={20} />,
    label: "Full Stack & IoT",
    text: "React, FastAPI, embedded C++ on Yocto — from device to cloud.",
  },
  {
    icon: <Database size={20} />,
    label: "Data Engineering",
    text: "Databricks, PySpark, dbt, Delta Lake. Batch and streaming at scale.",
  },
  {
    icon: <Brain size={20} />,
    label: "AI Engineering",
    text: "RAG systems, LLM agents, MLOps with Azure AI Foundry and MLflow.",
  },
];

export default function About() {
  return (
    <section id="about" className="py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between gap-8 mb-12"
        >
          <div>
            <p className="font-mono text-cyan-400 text-sm tracking-widest uppercase mb-3">
              About
            </p>
            <h2 className="text-4xl font-bold text-white">Who I am</h2>
          </div>
          <img
            src="/images/profile_pic.jpg"
            alt="Yves De Boeck"
            className="hidden sm:block w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover border border-slate-800 shadow-lg shrink-0"
          />
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-5 text-slate-400 leading-relaxed"
          >
            <img
              src="/images/profile_pic.jpg"
              alt="Yves De Boeck"
              className="sm:hidden w-20 h-20 rounded-2xl object-cover border border-slate-800 shadow-lg mb-2"
            />
            <p>
              I&apos;m a Belgian engineer with a deep passion for building
              systems that work in the real world — not just on paper. My
              career spans full-stack web development, IoT, cloud
              infrastructure, data engineering, and AI — and I&apos;m most
              energised when those disciplines intersect.
            </p>
            <p>
              I hold two master&apos;s degrees from the University of Antwerp,
              where I graduated{" "}
              <span className="text-slate-200 font-medium">magna cum laude</span>
              . After being offered a PhD in AI for autonomous vehicles, I chose
              industry to work on concrete problems at scale.
            </p>
            <p>
              Over the past six years I&apos;ve worked across energy, healthcare,
              and industrial IoT — building everything from embedded device
              firmware to production ML pipelines. What keeps me interested is
              the point where those layers meet: getting data off real hardware,
              through a platform that holds up, and into something people
              actually use.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-4"
          >
            {pillars.map((p) => (
              <div
                key={p.label}
                className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-colors group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-cyan-400 group-hover:text-cyan-300 transition-colors">
                    {p.icon}
                  </span>
                  <span className="text-slate-200 font-semibold text-sm">
                    {p.label}
                  </span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{p.text}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
