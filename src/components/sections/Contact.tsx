"use client";

import { motion } from "framer-motion";
import { profile } from "@/lib/data";
import { Mail, MapPin } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/BrandIcons";

export default function Contact() {
  return (
    <section id="contact" className="py-28 px-6 bg-slate-900/50">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl"
        >
          <p className="font-mono text-cyan-400 text-sm tracking-widest uppercase mb-3">
            Contact
          </p>
          <h2 className="text-4xl font-bold text-white mb-6">
            Let&apos;s work together
          </h2>
          <p className="text-slate-400 leading-relaxed mb-12">
            If you&apos;re building something ambitious with data or AI, I&apos;d
            love to hear about it.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <a
            href={`mailto:${profile.email}`}
            className="p-5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 transition-all group flex flex-col gap-3"
          >
            <Mail size={20} className="text-cyan-400" />
            <div>
              <p className="text-xs text-slate-500 mb-1">Email</p>
              <p className="text-sm text-slate-300 group-hover:text-white transition-colors break-all">
                {profile.email}
              </p>
            </div>
          </a>

          <a
            href={profile.github}
            target="_blank"
            rel="noopener noreferrer"
            className="p-5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 transition-all group flex flex-col gap-3"
          >
            <GithubIcon size={20} />
            <div>
              <p className="text-xs text-slate-500 mb-1">GitHub</p>
              <p className="text-sm text-slate-300 group-hover:text-white transition-colors">
                @ydb-solutions
              </p>
            </div>
          </a>

          <a
            href={profile.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="p-5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 transition-all group flex flex-col gap-3"
          >
            <LinkedinIcon size={20} />
            <div>
              <p className="text-xs text-slate-500 mb-1">LinkedIn</p>
              <p className="text-sm text-slate-300 group-hover:text-white transition-colors">
                Yves De Boeck
              </p>
            </div>
          </a>

          <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-3">
            <MapPin size={20} className="text-cyan-400" />
            <div>
              <p className="text-xs text-slate-500 mb-1">Location</p>
              <p className="text-sm text-slate-300">{profile.location}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
