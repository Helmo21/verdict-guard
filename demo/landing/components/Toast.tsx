"use client";

interface ToastProps {
  message: string;
  kind?: "success" | "error";
  testId?: string;
}

export function Toast({ message, kind = "success", testId }: ToastProps) {
  const colour =
    kind === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200";
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      data-testid={testId ?? "toast"}
      className={`mt-4 rounded-md border px-4 py-3 text-sm ${colour}`}
    >
      {message}
    </div>
  );
}
