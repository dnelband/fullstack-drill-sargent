// Write your own client HTTP layer here (inline or local api.ts).
// Flow: list → expand → Edit → form (title/body/slug) → save / publish → public preview.
// Apply latest on 409. Successful save must send draft title/body.

export function ChallengeApp() {
  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h1 className="text-3xl font-semibold">Slug Publish Studio</h1>
        <p className="mt-2 text-slate-400">Implement the page studio UI here.</p>
      </div>
    </div>
  );
}
