"use client";

import { useState } from "react";

type Result = {
  name: string;
  score: number;
  description?: string;
};

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);

    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const data = await res.json();
    setResults(data.results);

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#1a0f12] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-8">

        {/* HEADER */}
        <div className="text-center">
          <h1
            className="text-5xl font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            VibeSearch
          </h1>
          <p className="text-[#c9a3a3] mt-3 text-lg">
            Discover places that match your aesthetic
          </p>
        </div>

        {/* INPUT */}
        <div className="bg-[#2a1418] border border-[#3a1f25] rounded-2xl p-6 shadow-2xl">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your vibe… (e.g. quiet burgundy café, warm lighting, elegant)"
            className="w-full p-4 rounded-xl bg-[#1f0f12] text-white placeholder-[#8b6b6b] focus:outline-none focus:ring-2 focus:ring-[#c9a3a3] resize-none"
            rows={4}
          />

          <button
            onClick={handleSearch}
            className="mt-5 w-full bg-[#7b1e2b] text-white py-3 rounded-xl font-semibold hover:bg-[#5e1520] transition"
          >
            {loading ? "Finding your vibe..." : "Find My Vibe"}
          </button>
        </div>

        {/* RESULTS */}
        {results.length > 0 && (
          <div className="space-y-5">

            {/* TOP RESULT */}
            <div className="bg-gradient-to-r from-emerald-500 to-green-700 text-white rounded-2xl p-6 shadow-xl border border-emerald-300/30">
              <p className="text-sm text-emerald-100 font-medium">
                Your top #1 choice is:
              </p>

              <h2
                className="text-3xl font-semibold mt-2"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                {results[0].name}
              </h2>

              <p className="text-sm text-emerald-100 mt-1">
                Match score: {results[0].score.toFixed(3)}
              </p>
            </div>

            {/* OTHER RESULTS */}
            <div className="space-y-4">
              {results.slice(1).map((r, i) => (
                <div
                  key={i}
                  className="bg-[#2a1418] border border-[#3a1f25] rounded-xl p-5 hover:bg-[#321820] transition"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">
                      #{i + 2} {r.name}
                    </h3>

                    <span className="text-sm text-[#c9a3a3]">
                      {r.score.toFixed(3)}
                    </span>
                  </div>

                  {r.description && (
                    <p className="text-sm text-[#b89292] mt-2 leading-relaxed">
                      {r.description}
                    </p>
                  )}
                </div>
              ))}
            </div>

          </div>
        )}
      </div>
    </main>
  );
}