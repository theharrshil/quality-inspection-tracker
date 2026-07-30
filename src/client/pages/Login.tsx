import { useState, type FormEvent } from "react";
import { ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Button, Field } from "../components/ui";

const inputClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

export function Login() {
  const { login } = useAuth();
  // Pre-filled with the seeded demo credentials for reviewer convenience.
  const [username, setUsername] = useState("supervisor");
  const [password, setPassword] = useState("inspect123");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to sign in. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6">
      <div className="w-full max-w-[430px] md:max-w-sm md:rounded-2xl md:border md:border-slate-200 md:bg-white md:p-8 md:shadow-sm">
        <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-3xl shadow-lg shadow-indigo-600/30">
          🧵
        </div>
        <h1 className="text-xl font-bold text-slate-900">
          Quality Inspection Tracker
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Sign in to log and resolve defects
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Username" htmlFor="username">
          <input
            id="username"
            className={inputClass}
            autoCapitalize="none"
            autoCorrect="off"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <input
            id="password"
            type="password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-600/20">
            {error}
          </p>
        )}

        <Button type="submit" disabled={busy} className="mt-2 w-full">
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Demo credentials are pre-filled.
        </p>
      </div>
    </div>
  );
}
