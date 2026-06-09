"use client";

import { motion } from "framer-motion";
import { profile } from "@/lib/data";
import { GraduationCap, Cpu, Database, Brain } from "lucide-react";

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
        >
          <p className="font-mono text-cyan-400 text-sm tracking-widest uppercase mb-3">
            About
          </p>
          <h2 className="text-4xl font-bold text-white mb-12">Who I am</h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-5 text-slate-400 leading-relaxed"
          >
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
              firmware to production ML pipelines. I&apos;m currently looking to
              bring this experience to an ambitious team in{" "}
              <span className="text-cyan-400">Toronto</span>,{" "}
              <span className="text-cyan-400">Zurich</span>, or{" "}
              <span className="text-cyan-400">Australia</span>.
            </p>

            <div className="flex items-start gap-3 pt-4 p-4 rounded-lg bg-slate-900 border border-slate-800">
              <GraduationCap size={20} className="text-cyan-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-slate-200 font-medium text-sm">
                  {profile.education.degree}
                </p>
                <p className="text-slate-500 text-sm">
                  {profile.education.institution}
                </p>
                <p className="text-slate-500 text-sm italic mt-1">
                  {profile.education.note}
                </p>
              </div>
            </div>
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
