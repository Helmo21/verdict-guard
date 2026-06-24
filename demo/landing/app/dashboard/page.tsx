const balance = 1234.56;
const transactions = [
  { id: "tx-001", date: "2026-06-22", payee: "Café Olympia", amount: -8.5 },
  { id: "tx-002", date: "2026-06-21", payee: "Salary", amount: 2400 },
  { id: "tx-003", date: "2026-06-20", payee: "Electricity", amount: -64.2 },
  { id: "tx-004", date: "2026-06-19", payee: "Bookshop", amount: -22.0 },
];

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-5">
        <div className="text-sm text-zinc-500">Current balance</div>
        <div data-testid="balance" className="mt-1 text-3xl font-semibold text-zinc-900">
          €{balance.toFixed(2)}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-5">
        <div className="mb-3 text-sm font-medium text-zinc-700">
          Recent transactions <span data-testid="transactions-count" className="text-zinc-500">({transactions.length})</span>
        </div>
        <table data-testid="transactions" className="w-full text-sm">
          <thead className="text-left text-zinc-500">
            <tr>
              <th className="py-1">Date</th>
              <th>Payee</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} data-testid={`tx-${t.id}`} className="border-t border-zinc-100">
                <td className="py-2 text-zinc-600">{t.date}</td>
                <td className="text-zinc-900">{t.payee}</td>
                <td className={`text-right ${t.amount < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  €{t.amount.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
