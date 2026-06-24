"use client";

import { useState } from "react";
import { Toast } from "@/components/Toast";

const DAILY_LIMIT = 1_000_000;
const INITIAL_BALANCE = 1_000;

export default function TransferPage() {
  const [amount, setAmount] = useState("");
  const [beneficiary, setBeneficiary] = useState("acct-42");
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [lastAmount, setLastAmount] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; kind: "success" | "error" } | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    setToast(null);
    if (!Number.isFinite(n) || n <= 0) {
      setToast({ message: "Enter a valid amount", kind: "error" });
      return;
    }
    if (n > DAILY_LIMIT) {
      setToast({ message: "Daily transfer limit exceeded", kind: "error" });
      return;
    }
    setBalance((b) => b - n);
    setLastAmount(n);
    setToast({ message: "Transfer successful toast", kind: "success" });
    setAmount("");
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Transfer money</h1>
      <p className="mt-1 text-sm text-zinc-500">Daily limit: €{DAILY_LIMIT.toLocaleString()}.</p>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <form onSubmit={handleSubmit} className="rounded-lg border border-zinc-200 bg-white p-5">
          <label className="block text-sm font-medium text-zinc-700">
            Amount
            <input
              aria-label="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              placeholder="100"
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-zinc-700">
            Beneficiary
            <select
              aria-label="Beneficiary"
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            >
              <option value="acct-42">acct-42 (Alice)</option>
              <option value="acct-77">acct-77 (Bob)</option>
            </select>
          </label>

          <button
            type="submit"
            className="mt-5 w-full rounded bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-500"
          >
            Send
          </button>

          {toast && <Toast message={toast.message} kind={toast.kind} />}
        </form>

        <aside className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="text-sm text-zinc-500">Current balance</div>
          <div data-testid="balance" className="mt-1 text-2xl font-semibold text-zinc-900">
            €{balance.toFixed(2)}
          </div>

          <div className="mt-6 text-sm text-zinc-500">Last transfer</div>
          <div data-testid="last-transfer-amount" className="mt-1 text-lg text-zinc-800">
            {lastAmount !== null ? `€${lastAmount.toFixed(2)}` : "—"}
          </div>
          <div data-testid="last-transfer-beneficiary" className="text-sm text-zinc-500">
            {lastAmount !== null ? beneficiary : ""}
          </div>
        </aside>
      </div>
    </div>
  );
}
