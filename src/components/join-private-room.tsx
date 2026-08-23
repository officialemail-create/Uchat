import { AlertCircle, ArrowRight, KeyRound, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";

interface JoinPrivateRoomProps {
  onSubmit: (code: string) => void | Promise<void>;
  isSubmitting?: boolean;
  error?: string;
}

export function JoinPrivateRoom({ onSubmit, isSubmitting = false, error }: JoinPrivateRoomProps) {
  const [code, setCode] = useState("");
  const [localError, setLocalError] = useState("");

  const normalizedCode = code.replace(/[^A-Z0-9]/g, "").slice(0, 6).toUpperCase();
  const hasValue = normalizedCode.length > 0;
  const isValid = normalizedCode.length === 6;
  const resolvedError = localError || error || "";

  const handleChange = (value: string) => {
    const nextValue = value.replace(/[^A-Z0-9]/g, "").slice(0, 6).toUpperCase();
    setCode(nextValue);

    if (nextValue.length > 0 && nextValue.length < 6) {
      setLocalError("Enter the full 6-character code.");
    } else {
      setLocalError("");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isValid) {
      setLocalError("Enter the full 6-character code.");
      return;
    }

    await onSubmit(normalizedCode);
  };

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
        <KeyRound className="h-6 w-6" />
      </div>

      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Join a private room</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Enter the 6-character invite code exactly as provided.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="sr-only">Join code</span>
          <input
            autoComplete="off"
            autoCapitalize="characters"
            inputMode="text"
            maxLength={6}
            value={normalizedCode}
            onChange={(event) => handleChange(event.target.value)}
            placeholder="ABC123"
            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-center font-mono text-lg uppercase tracking-widest text-gray-900 outline-none ring-0 transition focus:border-purple-500 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </label>

        {hasValue && !isValid ? (
          <div className="flex items-center gap-2 text-sm text-red-500">
            <AlertCircle className="h-4 w-4" />
            <span>Enter the full 6-character code.</span>
          </div>
        ) : null}

        {resolvedError ? (
          <div className="flex items-center gap-2 text-sm text-red-500">
            <AlertCircle className="h-4 w-4" />
            <span>{resolvedError}</span>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || !isValid}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Joining…
            </>
          ) : (
            <>
              Join room
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
