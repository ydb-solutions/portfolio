"use client";

import { motion } from "framer-motion";
import { projects } from "@/lib/data";
import { Lock, ExternalLink, Play } from "lucide-react";
import { GithubIcon } from "@/components/BrandIcons";
import { useRef, useState } from "react";

function VideoPreview({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setPlaying(true);
    }
  };

  return (
    <div className="relative rounded-lg overflow-hidden mb-4 bg-slate-800 aspect-video">
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-cover"
        controls={playing}
        playsInline
        preload="metadata"
        onEnded={() => setPlaying(false)}
      />
      {!playing && (
        <button
          onClick={handlePlay}
          className="absolute inset-0 flex items-center justify-center bg-slate-950/60 hover:bg-slate-950/40 transition-colors group/play"
          aria-label="Play demo"
        >
          <span className="w-12 h-12 rounded-full bg-cyan-500 flex items-center justify-center group-hover/play:bg-cyan-400 transition-colors shadow-lg">
            <Play size={20} className="text-slate-950 ml-0.5" fill="currentColor" />
          </span>
        </button>
      )}
    </div>
  );
}

export default function Projects() {
  const featured = projects.filter((p) => p.featured);
  const rest = projects.filter((p) => !p.featured);

  return (
    <section id="projects" className="py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="font-mono text-cyan-400 text-sm tracking-widest uppercase mb-3">
            Projects
          </p>
          <h2 className="text-4xl font-bold text-white mb-4">
            What I&apos;ve built
          </h2>
          <p className="text-slate-400 mb-12 max-w-xl">
            A mix of open-source personal projects and professional systems
            built in production environments.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {featured.map((project, i) => (
            <motion.div
              key={project.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group p-6 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col"
            >
              {project.video && <VideoPreview src={project.video} />}

              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {project.professional && (
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      professional
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {project.github ? (
                    <a
                      href={project.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-500 hover:text-cyan-400 transition-colors"
                    >
                      <GithubIcon size={18} />
                    </a>
                  ) : (
                    <span className="text-slate-700" title="Proprietary — not open source">
                      <Lock size={16} />
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                {project.name}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed flex-1 mb-4">
                {project.description}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-auto">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-500 border border-slate-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {rest.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            {rest.map((project, i) => (
              <motion.div
                key={project.name}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="p-4 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-slate-200">
                      {project.name}
                    </h3>
                    {project.professional && (
                      <span className="text-xs font-mono px-1.5 py-0 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        pro
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">
                    {project.description}
                  </p>
                </div>
                {project.github ? (
                  <a
                    href={project.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-600 hover:text-cyan-400 transition-colors shrink-0"
                  >
                    <ExternalLink size={14} />
                  </a>
                ) : (
                  <Lock size={14} className="text-slate-700 shrink-0" />
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
