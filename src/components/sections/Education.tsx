"use client";

import { motion } from "framer-motion";
import { education } from "@/lib/data";
import { GraduationCap, FileText } from "lucide-react";

export default function Education() {
  return (
    <section id="education" className="py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="font-mono text-cyan-400 text-sm tracking-widest uppercase mb-3">
            Education
          </p>
          <h2 className="text-4xl font-bold text-white mb-4">Academic background</h2>
          <p className="text-slate-400 mb-12 max-w-xl">
            The degree that started it all.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-4">
          {education.map((edu, i) => {
            const cardClass =
              "p-5 rounded-xl border border-cyan-500/30 bg-cyan-500/5 flex items-start gap-4 group hover:scale-[1.02] transition-transform";
            const content = (
              <>
                <div className="shrink-0 w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-400 border border-slate-700">
                  <GraduationCap size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-200 leading-tight">
                    {edu.degree}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{edu.institution}</p>
                  <p className="text-xs text-slate-500 italic mt-1.5">{edu.note}</p>
                </div>
                {edu.file && (
                  <FileText
                    size={15}
                    className="shrink-0 text-slate-500 group-hover:text-cyan-400 transition-colors mt-0.5"
                  />
                )}
              </>
            );

            return edu.file ? (
              <motion.a
                key={edu.degree}
                href={edu.file}
                target="_blank"
                rel="noopener noreferrer"
                title="View diploma"
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
                key={edu.degree}
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
