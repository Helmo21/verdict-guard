"use client";

import { useState } from "react";
import { Toast } from "@/components/Toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggedInAs, setLoggedInAs] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (email === "alice@verdict.bank" && password === "correct-horse") {
      setLoggedInAs(email);
      return;
    }
    setError("Invalid email or password");
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Login</h1>
      <p className="mt-1 text-sm text-zinc-500">Try alice@verdict.bank / correct-horse.</p>

      <form onSubmit={handleSubmit} className="mt-6 max-w-sm rounded-lg border border-zinc-200 bg-white p-5">
        <label className="block text-sm font-medium text-zinc-700">
          Email
          <input
            aria-label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-zinc-700">
          Password
          <input
            aria-label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          className="mt-5 w-full rounded bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-500"
        >
          Sign in
        </button>

        {error && <Toast message={error} kind="error" testId="login-error" />}
        {loggedInAs && (
          <div data-testid="logged-in-as" className="mt-4 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Logged in as <strong>{loggedInAs}</strong>
          </div>
        )}
      </form>
    </div>
  );
}
