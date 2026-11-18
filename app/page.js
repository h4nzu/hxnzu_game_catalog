import fs from "fs";
import path from "path";
import CatalogClient from "@/components/CatalogClient";

function getGames() {
  const filePath = path.join(process.cwd(), "data", "games.json");
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

export default function HomePage() {
  const games = getGames();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-emerald-400">
              hxnzu's game catalog
            </h1>
            <p className="text-xs text-zinc-400">
              {games.length.toLocaleString()} indexed titles
            </p>
          </div>
        </div>
      </header>

      <CatalogClient initialGames={games} />
    </main>
  );
}