"use client";
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-dvh grid place-items-center p-6 text-center">
      <div className="max-w-md">
        <div className="text-2xl font-semibold display">Something went wrong</div>
        <p className="mt-2 text-sm text-mute">{error.message === "Forbidden" ? "You don't have access to that." : "Please try again. If it keeps happening, tell your tutor."}</p>
        <button className="btn-primary mt-6" onClick={reset}>Try again</button>
      </div>
    </div>
  );
}
