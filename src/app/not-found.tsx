import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl font-bold text-[var(--color-primary)] mb-2">404</div>
        <h2 className="text-xl font-bold mb-2">Page not found</h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">
          This page doesn&apos;t exist. Maybe you took a wrong turn?
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-6 py-3 bg-[var(--color-primary)] rounded-lg font-medium text-white hover:bg-[var(--color-primary-dark)] transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
