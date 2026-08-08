// Write your own client HTTP layer here (inline or local api.ts).
// Flow: start → next(exclude) → answer → append AttemptResult from 200 only → summary.

export function ChallengeApp() {
  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h1 className="text-3xl font-semibold">Pulse Quiz</h1>
        <p className="mt-2 text-slate-400">Implement the timed quiz UI here.</p>
      </div>
    </div>
  );
}
