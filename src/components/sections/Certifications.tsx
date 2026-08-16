"use client";

import { motion } from "framer-motion";
import { certifications } from "@/lib/data";
import { Award, FileText } from "lucide-react";

const tierColors: Record<string, string> = {
  professional:
    "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  associate:
    "bg-blue-500/10 text-blue-400 border-blue-500/30",
  fundamentals:
    "bg-slate-700/50 text-slate-400 border-slate-600",
};

const issuerIcon: Record<string, string> = {
  Databricks: "DB",
  Microsoft: "MS",
  Amazon: "AWS",
  "Scrum.org": "PSM",
  Oracle: "ORC",
  "Python Institute": "PY",
};

export default function Certifications() {
  return (
    <section id="certifications" className="py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="font-mono text-cyan-400 text-sm tracking-widest uppercase mb-3">
            Certifications
          </p>
          <h2 className="text-4xl font-bold text-white mb-4">
            Verified expertise
          </h2>
          <p className="text-slate-400 mb-12 max-w-xl">
            Credentials across Databricks, Azure, AWS, and software engineering
            fundamentals.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {certifications.map((cert, i) => {
            const cardClass = `p-4 rounded-xl border ${tierColors[cert.tier]} flex items-center gap-4 group hover:scale-[1.02] transition-transform`;
            const content = (
              <>
                <div className="shrink-0 w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-mono font-bold text-slate-400 border border-slate-700">
                  {issuerIcon[cert.issuer] ?? <Award size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-200 leading-tight">
                    {cert.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{cert.issuer}</p>
                </div>
                {cert.file && (
                  <FileText
                    size={15}
                    className="shrink-0 text-slate-500 group-hover:text-cyan-400 transition-colors"
                  />
                )}
              </>
            );

            return cert.file ? (
              <motion.a
                key={cert.name}
                href={cert.file}
                target="_blank"
                rel="noopener noreferrer"
                title="View certificate"
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className={`${cardClass} cursor-pointer`}
              >
                {content}
              </motion.a>
            ) : (
              <motion.div
                key={cert.name}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className={cardClass}
              >
                {content}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
