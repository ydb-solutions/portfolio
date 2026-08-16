import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Yves De Boeck — Data & AI Engineer",
  description:
    "Data & AI Engineer with expertise in Databricks, Azure, RAG systems, and LLM agents. Based in Belgium.",
  keywords: [
    "Data Engineer",
    "AI Engineer",
    "Databricks",
    "Azure",
    "Python",
    "FastAPI",
    "React",
  ],
  openGraph: {
    title: "Yves De Boeck — Data & AI Engineer",
    description:
      "Building production-grade data platforms, cloud infrastructure, and AI systems.",
    url: "https://portfolio.ydb-solutions.com",
    siteName: "Yves De Boeck Portfolio",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-50 scroll-smooth">
        {children}
      </body>
    </html>
  );
}
