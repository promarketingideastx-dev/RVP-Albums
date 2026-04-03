"use client";

import { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Critical Renderer Error Detected:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-red-950 text-red-100 p-8">
      <h2 className="text-2xl font-bold mb-4">The Editor experienced a critical error</h2>
      <pre className="bg-black/50 p-4 rounded text-sm mb-6 max-w-2xl overflow-auto border border-red-500/30">
        {error.message}
      </pre>
      <button
        onClick={() => reset()}
        className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded font-semibold transition"
      >
        Restart Editor Session
      </button>
    </div>
  );
}
