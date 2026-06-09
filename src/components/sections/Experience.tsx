"use client";

import { motion } from "framer-motion";
import { experiences } from "@/lib/data";

export default function Experience() {
  return (
    <section id="experience" className="py-28 px-6 bg-slate-900/50">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="font-mono text-cyan-400 text-sm tracking-widest uppercase mb-3">
            Experience
          </p>
          <h2 className="text-4xl font-bold text-white mb-16">
            Where I&apos;ve worked
          </h2>
        </motion.div>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-0 md:left-[11px] top-2 bottom-2 w-px bg-slate-800 hidden md:block" />

          <div className="space-y-12">
            {experiences.map((exp, i) => (
              <motion.div
                key={exp.company}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="relative md:pl-10"
              >
                {/* Timeline dot */}
                <div className="absolute left-[-5px] top-2 w-3 h-3 rounded-full bg-cyan-400 border-2 border-slate-950 hidden md:block" />

                <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        {exp.company}
                      </h3>
                      <p className="text-cyan-400 font-medium text-sm mt-0.5">
                        {exp.role}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-slate-400 text-sm font-mono">
                        {exp.period}
                      </p>
                      <p className="text-slate-600 text-xs mt-0.5">
                        {exp.location}
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-2 mb-5">
                    {exp.highlights.map((h, j) => (
                      <li key={j} className="flex gap-3 text-sm text-slate-400 leading-relaxed">
                        <span className="text-cyan-500 mt-1 shrink-0">›</span>
                        {h}
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-wrap gap-2">
                    {exp.tech.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-400 border border-slate-700"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
