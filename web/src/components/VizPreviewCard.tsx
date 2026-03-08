"use client";

import Link from "next/link";
import { motion } from "framer-motion";

type Props = {
  title: string;
  subtitle: string;
  href: string;
  children: React.ReactNode;
};

export default function VizPreviewCard({
  title,
  subtitle,
  href,
  children,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="group rounded-2xl border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>

      {/* Preview visualization area */}
      <div className="mt-5 h-48 overflow-hidden rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
        {children}
      </div>

      <Link
        href={href}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent/80"
      >
        Explore
        <svg
          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </Link>
    </motion.div>
  );
}
