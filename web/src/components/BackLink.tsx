import Link from "next/link";

export default function BackLink({ href = "/", label = "Back to Home" }: { href?: string; label?: string }) {
  return (
    <Link
      href={href}
      className="mb-6 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-zinc-100"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      {label}
    </Link>
  );
}
