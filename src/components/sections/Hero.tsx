"use client";

import { motion } from "framer-motion";
import { profile } from "@/lib/data";
import { Mail, MapPin, ArrowDown } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/BrandIcons";

export default function Hero() {
  return (
    <section
      id="hero"
      className="min-h-screen flex flex-col items-center justify-center relative px-6 pt-16"
    >
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950" />

      <div className="relative max-w-3xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="font-mono text-cyan-400 text-sm mb-4 tracking-widest uppercase">
            Available for relocation
          </p>

          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-4">
            {profile.name}
          </h1>

          <h2 className="text-2xl md:text-3xl font-light text-slate-400 mb-6">
            {profile.title}
          </h2>

          <p className="text-slate-400 text-lg leading-relaxed max-w-2xl mb-8">
            {profile.tagline}
          </p>

          <div className="flex items-center gap-2 text-slate-500 text-sm mb-10">
            <MapPin size={14} className="text-cyan-500" />
            <span>Belgium</span>
            <span className="text-slate-700">→</span>
            {profile.relocating.map((city, i) => (
              <span key={city}>
                <span className="text-slate-300">{city}</span>
                {i < profile.relocating.length - 1 && (
                  <span className="text-slate-700 ml-2">·</span>
                )}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-4">
            <a
              href={profile.github}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-all border border-slate-700 hover:border-slate-600"
            >
              <GithubIcon size={16} />
              GitHub
            </a>
            <a
              href={profile.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-all border border-slate-700 hover:border-slate-600"
            >
              <LinkedinIcon size={16} />
              LinkedIn
            </a>
            <a
              href={`mailto:${profile.email}`}
              className="flex items-center gap-2 px-5 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-sm font-semibold transition-all"
            >
              <Mail size={16} />
              Get in touch
            </a>
          </div>
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
      >
        <a href="#about" className="text-slate-600 hover:text-cyan-400 transition-colors">
          <ArrowDown size={24} className="animate-bounce" />
        </a>
      </motion.div>
    </section>
  );
}
