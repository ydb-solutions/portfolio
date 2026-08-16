import type { ReactNode } from "react";

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-2xl md:text-3xl font-bold text-white mt-16 mb-5 scroll-mt-24">
      {children}
    </h2>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-lg font-semibold text-slate-100 mt-10 mb-3">
      {children}
    </h3>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="text-slate-400 leading-relaxed mb-5">{children}</p>;
}

export function Em({ children }: { children: ReactNode }) {
  return <span className="text-slate-200 font-medium">{children}</span>;
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="font-mono text-[0.85em] text-cyan-300 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5">
      {children}
    </code>
  );
}

export function Pre({ children }: { children: ReactNode }) {
  return (
    <div className="my-6 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
      <pre className="p-4 text-[0.8rem] leading-relaxed font-mono text-slate-300 min-w-max">
        {children}
      </pre>
    </div>
  );
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="space-y-3 mb-6 text-slate-400 leading-relaxed">{children}</ul>
  );
}

export function LI({ children }: { children: ReactNode }) {
  return (
    <li className="relative pl-5 before:absolute before:left-0 before:top-[0.6em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-cyan-500/70">
      {children}
    </li>
  );
}

export function Callout({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="my-8 rounded-xl border border-cyan-500/25 bg-cyan-500/[0.04] p-5">
      <p className="font-mono text-cyan-400 text-xs tracking-widest uppercase mb-2">
        {label}
      </p>
      <div className="text-slate-300 leading-relaxed text-[0.95rem]">
        {children}
      </div>
    </div>
  );
}

export function Table({
  head,
  rows,
}: {
  head: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="my-6 overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-sm min-w-max">
        <thead>
          <tr className="bg-slate-900/70">
            {head.map((h) => (
              <th
                key={h}
                className="text-left font-semibold text-slate-300 px-4 py-3 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-slate-800/80">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-slate-400 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
