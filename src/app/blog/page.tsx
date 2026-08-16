import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { posts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Writing — Yves De Boeck",
  description:
    "Notes on data platforms, geospatial pipelines, and building systems that hold up in production.",
};

export default function BlogIndex() {
  return (
    <main className="min-h-screen px-6 py-24">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-400 transition-colors mb-12"
        >
          <ArrowLeft size={14} />
          Home
        </Link>

        <p className="font-mono text-cyan-400 text-sm tracking-widest uppercase mb-3">
          Writing
        </p>
        <h1 className="text-4xl font-bold text-white mb-6">Notes</h1>
        <p className="text-slate-400 leading-relaxed mb-16">
          Longer-form write-ups on things I have built — the constraints, the
          decisions, and the parts that did not work the first time.
        </p>

        <div className="space-y-4">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block p-6 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 transition-all group"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <h2 className="text-lg font-semibold text-slate-100 group-hover:text-white transition-colors">
                  {post.title}
                </h2>
                <ArrowUpRight
                  size={18}
                  className="text-slate-600 group-hover:text-cyan-400 transition-colors shrink-0 mt-1"
                />
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                {post.blurb}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-slate-500">
                  {new Date(post.date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span className="text-slate-700">·</span>
                <span className="font-mono text-xs text-slate-500">
                  {post.readingTime}
                </span>
                {post.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-400 border border-slate-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
