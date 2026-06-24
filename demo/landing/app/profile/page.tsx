"use client";

import { useState } from "react";
import { Toast } from "@/components/Toast";

export default function ProfilePage() {
  const [name, setName] = useState("Alice Hopper");
  const [email, setEmail] = useState("alice@verdict.bank");
  const [saved, setSaved] = useState<{ name: string; email: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved({ name, email });
    setToast("Profile saved");
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Profile</h1>

      <form onSubmit={handleSubmit} className="mt-6 max-w-sm rounded-lg border border-zinc-200 bg-white p-5">
        <label className="block text-sm font-medium text-zinc-700">
          Full name
          <input
            aria-label="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-zinc-700">
          Email
          <input
            aria-label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          className="mt-5 w-full rounded bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-500"
        >
          Save
        </button>

        {toast && <Toast message={toast} testId="profile-toast" />}

        {saved && (
          <div className="mt-4 rounded bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
            Saved name: <span data-testid="saved-name">{saved.name}</span>
            <br />
            Saved email: <span data-testid="saved-email">{saved.email}</span>
          </div>
        )}
      </form>
    </div>
  );
}
