import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Verdict Bank — verdict-guard demo",
  description: "Mock app used to demonstrate verdict-guard. Not a real bank.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
