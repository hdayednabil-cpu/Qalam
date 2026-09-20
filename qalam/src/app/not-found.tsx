import Link from "next/link";
export default function NotFound() {
  return (
    <div className="min-h-dvh grid place-items-center p-6 text-center">
      <div>
        <div className="text-6xl font-semibold display text-ink-200">404</div>
        <p className="mt-2 text-mute">That page doesn't exist or you don't have access to it.</p>
        <Link href="/" className="btn-primary mt-6 inline-flex">Go home</Link>
      </div>
    </div>
  );
}
