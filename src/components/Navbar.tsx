"use client";

import { useEffect, useState } from "react";

const links = [
  { label: "About", href: "#about" },
  { label: "Experience", href: "#experience" },
  { label: "Projects", href: "#projects" },
  { label: "Writing", href: "/blog" },
  { label: "Skills", href: "#skills" },
  { label: "Certifications", href: "#certifications" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-slate-950/95 backdrop-blur-sm border-b border-slate-800"
          : "bg-transparent"
      }`}
    >
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a
          href="#hero"
          className="text-cyan-400 font-mono font-bold text-lg tracking-tight hover:text-cyan-300 transition-colors"
        >
          ydb
        </a>
        <ul className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-slate-400 text-sm hover:text-cyan-400 transition-colors font-medium"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <a
          href="mailto:yves.deboeck@ydb-solutions.com"
          className="hidden md:block text-sm font-medium px-4 py-2 rounded border border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 transition-colors"
        >
          Get in touch
        </a>
      </nav>
    </header>
  );
}
