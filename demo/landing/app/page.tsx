import Link from "next/link";

const flows = [
  { href: "/transfer", title: "Transfer money", desc: "Send funds with daily-limit validation." },
  { href: "/login", title: "Login", desc: "Email + password authentication." },
  { href: "/dashboard", title: "Dashboard", desc: "Balance and recent transactions." },
  { href: "/profile", title: "Profile", desc: "Update profile information." },
];

export default function Home() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-zinc-900">Welcome to Verdict Bank</h1>
      <p className="mt-2 text-zinc-600">
        A mock app used by <code className="text-brand-600">verdict-guard</code> to demonstrate test-honesty
        analysis. Use the navigation to explore the flows the tests are written against.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {flows.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            data-testid={`flow-${f.href.slice(1)}`}
            className="rounded-lg border border-zinc-200 bg-white p-5 hover:border-brand-500 hover:shadow-sm"
          >
            <div className="text-lg font-medium text-zinc-900">{f.title}</div>
            <div className="mt-1 text-sm text-zinc-500">{f.desc}</div>
          </Link>
        ))}
      </div>

      <div className="mt-10 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>How to read this demo:</strong> open <code>demo/landing/tests/</code> next to the page that the
        test claims to verify. Then run <code>npm run demo</code> in the repo root to see what
        verdict-guard says about each test.
      </div>
    </div>
  );
}
