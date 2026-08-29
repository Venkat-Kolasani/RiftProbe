"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

interface EventItem {
  scenario_id: string;
  goal: string;
  verdict: string;
  score: number;
  violated_invariants: string[];
  failure_id?: string;
}

export default function LiveRunView() {
  const params = useParams();
  const router = useRouter();
  const runId = params.id as string;

  const [events, setEvents] = useState<EventItem[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!runId) return;

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const eventSource = new EventSource(`${apiBase}/v1/runs/${runId}/events`);

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event_type === "scenario_completed") {
          setEvents((prev) => [data, ...prev]);
          setCompletedCount((prev) => prev + 1);
        }
      } catch (err) {
        console.error("Failed to parse SSE event:", err);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [runId]);

  return (
    <div>
      <Navbar />
      <main className="max-w-6xl mx-auto p-8 space-y-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-3">
              <span>Live Run Execution</span>
              <span className="text-xs bg-cyan-900/60 text-cyan-300 font-mono px-2.5 py-1 rounded-full border border-cyan-700">
                {runId.substring(0, 8)}
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Streaming real-time execution results from Evaluation Worker
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isConnected ? "bg-emerald-400 animate-pulse" : "bg-slate-600"
                }`}
              />
              <span className="text-xs text-slate-400 font-mono">
                {isConnected ? "LIVE STREAMING" : "DISCONNECTED"}
              </span>
            </div>

            <button
              onClick={() => router.push("/failures")}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm px-4 py-2 rounded-lg font-medium border border-slate-700"
            >
              View Failure Explorer
            </button>
          </div>
        </div>

        {/* Counter Card */}
        <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center justify-between">
          <div className="text-slate-300 font-medium">
            Scenarios Completed: <span className="text-cyan-400 font-bold text-lg">{completedCount}</span>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            {completedCount === 0 ? "Executing scenarios..." : "Processing Redis queue"}
          </div>
        </div>

        {/* Live Event Feed */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Completed Trajectories
          </h2>

          {events.length === 0 ? (
            <div className="bg-slate-800/40 border border-slate-800 p-8 text-center text-slate-500 rounded-xl">
              Waiting for scenario completion events...
            </div>
          ) : (
            events.map((ev, idx) => (
              <div
                key={idx}
                className="bg-slate-800/80 border border-slate-700 p-4 rounded-xl flex justify-between items-center"
              >
                <div>
                  <div className="text-slate-200 font-medium text-sm">{ev.goal}</div>
                  {ev.violated_invariants && ev.violated_invariants.length > 0 && (
                    <div className="text-xs text-rose-400 mt-1 font-mono">
                      Violated: {ev.violated_invariants.join(", ")}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-4">
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full font-mono ${
                      ev.verdict === "PASS"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : "bg-rose-950 text-rose-400 border border-rose-800"
                    }`}
                  >
                    {ev.verdict}
                  </span>

                  {ev.failure_id && (
                    <button
                      onClick={() => router.push("/failures")}
                      className="text-xs bg-rose-900/40 hover:bg-rose-900/60 text-rose-300 px-3 py-1 rounded border border-rose-700"
                    >
                      Explore Failure
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
