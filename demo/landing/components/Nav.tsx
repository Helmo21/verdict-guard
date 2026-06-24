import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/transfer", label: "Transfer" },
  { href: "/login", label: "Login" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profile", label: "Profile" },
];

export function Nav() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-semibold text-brand-600">
          🏦 Verdict Bank
        </Link>
        <nav className="flex gap-4 text-sm">
          {links.slice(1).map((l) => (
            <Link key={l.href} href={l.href} className="text-zinc-600 hover:text-brand-600">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
