// Write your own client HTTP layer here (inline or local api.ts).
// On load: POST /api/products/query with filters: [].
// Apply filters builds the filters array and replaces the list from the 200 body.

export function ChallengeApp() {
  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <h1 className="text-3xl font-semibold">Product Filter Desk</h1>
        <p className="mt-2 text-slate-400">Implement the product filter UI here.</p>
      </div>
    </div>
  );
}
