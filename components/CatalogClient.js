"use client";

import { useState, useMemo } from "react";
import {
  Search,
  HardDrive,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Plus,
  Check,
  Trash2,
  X,
  Copy,
} from "lucide-react";

const ITEMS_PER_PAGE = 24;

// Extract numeric size in GB from strings like "45.6 GB", "850 MB", or "45.6/68.2 GB"
function parseSizeInGB(sizeStr) {
  if (!sizeStr || sizeStr === "N/A") return null;

  const gbMatch = sizeStr.match(/([\d.]+)\s*GB/i);
  if (gbMatch) return parseFloat(gbMatch[1]);

  const mbMatch = sizeStr.match(/([\d.]+)\s*MB/i);
  if (mbMatch) return parseFloat(mbMatch[1]) / 1024;

  return null;
}

// Assign consistent PHP price based on size tier
function getGamePrice(game) {
  const sizeGB =
    parseSizeInGB(game.originalSize) ?? parseSizeInGB(game.repackSize) ?? 15;

  const variant = game.id % 3;

  if (sizeGB < 30) {
    const tiers = [50, 75, 100];
    return { price: tiers[variant], label: "Indie / Standard", sizeGB };
  }

  if (sizeGB <= 80) {
    const tiers = [150, 200, 250];
    return { price: tiers[variant], label: "AAA Title", sizeGB };
  }

  const tiers = [200, 250, 300];
  return { price: tiers[variant], label: "Massive Title", sizeGB };
}

export default function CatalogClient({ initialGames }) {
  const [query, setQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);

  // Shopping Cart State
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Cart Helpers
  const isInCart = (id) => cart.some((item) => item.id === id);

  const toggleCartItem = (game) => {
    setCart((prev) => {
      const exists = prev.some((item) => item.id === game.id);
      if (exists) {
        return prev.filter((item) => item.id !== game.id);
      }
      const { price, sizeGB } = getGamePrice(game);
      return [...prev, { ...game, price, sizeGB }];
    });
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotals = useMemo(() => {
    return cart.reduce(
      (acc, item) => ({
        price: acc.price + item.price,
        sizeGB: acc.sizeGB + (item.sizeGB || 0),
      }),
      { price: 0, sizeGB: 0 }
    );
  }, [cart]);

  const handleCopyOrder = async () => {
    if (cart.length === 0) return;

    const lines = cart.map(
      (item, index) =>
        `${index + 1}. ${item.title} (${item.originalSize}) - ₱${item.price}`
    );

    const summary = [
      "🎮 *GAME ORDER LIST*",
      "------------------------",
      ...lines,
      "------------------------",
      `📦 Total Games: ${cart.length}`,
      `💾 Est. Total Size: ${cartTotals.sizeGB.toFixed(1)} GB`,
      `💰 Total Price: ₱${cartTotals.price.toLocaleString()}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert("Could not copy automatically. Please copy manually.");
    }
  };

  // Extract top 15 most common genres for filter pills
  const topGenres = useMemo(() => {
    const counts = {};
    initialGames.forEach((g) =>
      g.genres.forEach((genre) => {
        counts[genre] = (counts[genre] || 0) + 1;
      })
    );
    return [
      "All",
      ...Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([genre]) => genre),
    ];
  }, [initialGames]);

  // Filter and sort games
  const filteredGames = useMemo(() => {
    const q = query.toLowerCase().trim();
    const filtered = initialGames.filter((game) => {
      const matchesQuery =
        !q ||
        game.title.toLowerCase().includes(q) ||
        game.genres.some((g) => g.toLowerCase().includes(q));
      const matchesGenre =
        selectedGenre === "All" || game.genres.includes(selectedGenre);
      return matchesQuery && matchesGenre;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "az") return a.title.localeCompare(b.title);
      if (sortBy === "oldest") return a.date.localeCompare(b.date);
      if (sortBy === "price-asc")
        return getGamePrice(a).price - getGamePrice(b).price;
      if (sortBy === "price-desc")
        return getGamePrice(b).price - getGamePrice(a).price;
      return b.date.localeCompare(a.date);
    });
  }, [initialGames, query, selectedGenre, sortBy]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredGames.length / ITEMS_PER_PAGE)
  );
  const paginatedGames = filteredGames.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const handleSearch = (val) => {
    setQuery(val);
    setPage(1);
  };

  const handleGenreChange = (genre) => {
    setSelectedGenre(genre);
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-24">
      {/* Search, Sort & Top Cart Button */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search game title or genre..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 sm:py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="flex-1 sm:flex-none bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 sm:py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="az">Alphabetical (A–Z)</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl px-4 py-3 sm:py-2.5 text-sm font-medium text-zinc-100 transition"
            aria-label="Open shopping cart"
          >
            <ShoppingCart className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline">Cart</span>
            <span className="bg-emerald-500 text-zinc-950 text-xs font-bold px-2 py-0.5 rounded-full">
              {cart.length}
            </span>
          </button>
        </div>
      </div>

      {/* Genre Filter Pills - Horizontal swipeable on mobile */}
      <div className="flex overflow-x-auto gap-2 pb-1 [-ms-overflow-style:none] [scrollbar-width:none]">
        {topGenres.map((genre) => (
          <button
            key={genre}
            onClick={() => handleGenreChange(genre)}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-medium transition shrink-0 ${
              selectedGenre === genre
                ? "bg-emerald-500 text-zinc-950 font-semibold shadow-lg shadow-emerald-500/20"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800"
            }`}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Results Count */}
      <div className="text-xs text-zinc-400 px-1">
        Showing {paginatedGames.length} of{" "}
        {filteredGames.length.toLocaleString()} games
      </div>

      {/* Game Grid */}
      {paginatedGames.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
          No games matched your filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {paginatedGames.map((game) => {
            const { price } = getGamePrice(game);
            const added = isInCart(game.id);

            return (
              <div
                key={game.id}
                className={`group bg-zinc-900 border rounded-xl overflow-hidden flex flex-col transition shadow-sm ${
                  added
                    ? "border-emerald-500 ring-1 ring-emerald-500/40"
                    : "border-zinc-800/80 hover:border-emerald-500/50"
                }`}
              >
                {/* Cover Image */}
                <div className="aspect-[3/4] bg-zinc-950 relative overflow-hidden">
                  {game.cover ? (
                    <img
                      src={game.cover}
                      alt={game.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                      No Cover
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-zinc-950/85 backdrop-blur px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold text-emerald-400 border border-zinc-800">
                    {game.repackSize}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-2.5 sm:space-y-3">
                  <div>
                    <h2 className="font-semibold text-xs sm:text-sm text-zinc-100 line-clamp-2 leading-snug">
                      {game.title}
                    </h2>
                    <div className="hidden sm:flex flex-wrap gap-1 mt-2">
                      {game.genres.slice(0, 2).map((g) => (
                        <span
                          key={g}
                          className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 sm:pt-3 border-t border-zinc-800/80 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] sm:text-xs text-zinc-400 gap-0.5 sm:gap-0">
                      <span className="flex items-center gap-1 truncate">
                        <HardDrive className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-500 shrink-0" />
                        <span className="truncate">{game.originalSize}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-500 shrink-0" />
                        {game.date}
                      </span>
                    </div>

                    {/* Interactive Add-to-Cart Price Button */}
                    <button
                      onClick={() => toggleCartItem(game)}
                      className={`w-full flex items-center justify-between px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition active:scale-[0.98] ${
                        added
                          ? "bg-emerald-500 text-zinc-950"
                          : "bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                      }`}
                    >
                      <span className="flex items-center gap-1 text-[11px] sm:text-xs">
                        {added ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            Added
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            Add
                          </>
                        )}
                      </span>
                      <span className="font-bold">₱{price}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-6 pb-4">
          <button
            disabled={page === 1}
            onClick={() => {
              setPage((p) => Math.max(1, p - 1));
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 disabled:opacity-40 hover:bg-zinc-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-zinc-400">
            Page <strong className="text-zinc-100">{page}</strong> of{" "}
            <strong className="text-zinc-100">{totalPages}</strong>
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => {
              setPage((p) => Math.min(totalPages, p + 1));
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 disabled:opacity-40 hover:bg-zinc-800"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Floating Bottom Cart Summary Bar (appears when cart has items) */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-4 inset-x-3 sm:inset-x-auto sm:right-6 sm:w-96 z-30">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-2xl px-4 py-3.5 shadow-2xl shadow-emerald-950/80 flex items-center justify-between font-semibold transition active:scale-[0.99]"
          >
            <div className="flex items-center gap-2.5">
              <div className="bg-zinc-950 text-emerald-400 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                {cart.length}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold leading-tight">
                  View Selected Games
                </div>
                <div className="text-[11px] opacity-80">
                  Est. {cartTotals.sizeGB.toFixed(1)} GB total
                </div>
              </div>
            </div>
            <div className="text-base font-extrabold">
              ₱{cartTotals.price.toLocaleString()}
            </div>
          </button>
        </div>
      )}

      {/* Slide-Over Shopping Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
          />

          {/* Drawer Panel */}
          <div className="relative z-10 w-full max-w-md bg-zinc-950 border-l border-zinc-800 h-full flex flex-col">
            {/* Drawer Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-400" />
                <h2 className="font-bold text-base text-zinc-100">
                  Selected Games ({cart.length})
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-zinc-400 hover:text-red-400 px-2 py-1 rounded transition"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-zinc-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 space-y-2 py-12">
                  <ShoppingCart className="w-10 h-10 opacity-30" />
                  <p className="text-sm font-medium text-zinc-400">
                    Your cart is empty
                  </p>
                  <p className="text-xs max-w-xs">
                    Tap &ldquo;Add&rdquo; on any game card to calculate total
                    storage size and price.
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-2.5"
                  >
                    {item.cover ? (
                      <img
                        src={item.cover}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-12 h-16 object-cover rounded-lg bg-zinc-950 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-16 rounded-lg bg-zinc-950 shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-semibold text-zinc-100 line-clamp-2">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400">
                        <span>{item.originalSize}</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-bold">
                          ₱{item.price}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-2 text-zinc-500 hover:text-red-400 transition shrink-0"
                      aria-label={`Remove ${item.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer / Checkout Summary */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 space-y-3">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Estimated Storage Needed</span>
                    <span className="text-zinc-200 font-medium">
                      {cartTotals.sizeGB.toFixed(1)} GB
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-1 border-t border-zinc-800">
                    <span className="text-zinc-100">Total Amount</span>
                    <span className="text-emerald-400 text-base">
                      ₱{cartTotals.price.toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCopyOrder}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.99]"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      Order List Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Order List to Send
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}