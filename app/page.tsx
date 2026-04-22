"use client";

import { useState } from "react";
import MealPlanForm, { type FormData } from "@/app/components/MealPlanForm";
import MealPlanResult from "@/app/components/MealPlanResult";
import type { MealPlanResponse } from "@/app/api/meal-plan/route";

type Status = "idle" | "loading" | "success" | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [mealPlan, setMealPlan] = useState<MealPlanResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(formData: FormData) {
    setStatus("loading");
    setMealPlan(null);
    setErrorMessage("");

    try {
      const res = await fetch("/api/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong.");
      }

      setMealPlan(data);
      setStatus("success");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  function handleReset() {
    setStatus("idle");
    setMealPlan(null);
    setErrorMessage("");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center gap-3">
          <span className="text-2xl">🥗</span>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Grocery Helper</h1>
            <p className="text-xs text-gray-400">AI-powered meal planner & shopping list</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10">
        {/* Form state */}
        {(status === "idle" || status === "loading" || status === "error") && (
          <div className="mx-auto max-w-xl">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-gray-800">Plan your week</h2>
              <p className="mt-1 text-gray-500 text-sm">
                Fill in your preferences and get a personalised 7-day dinner plan with a ready-made
                shopping list.
              </p>
            </div>

            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6">
              <MealPlanForm onSubmit={handleSubmit} isLoading={status === "loading"} />
            </div>

            {/* Loading overlay message */}
            {status === "loading" && (
              <div className="mt-6 flex flex-col items-center gap-3 text-center">
                <div className="size-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                <p className="text-sm text-gray-500">
                  Generating your meal plan — this can take 5–10 seconds…
                </p>
              </div>
            )}

            {/* Error */}
            {status === "error" && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}
          </div>
        )}

        {/* Results state */}
        {status === "success" && mealPlan && (
          <MealPlanResult data={mealPlan} onReset={handleReset} />
        )}
      </main>

      <footer className="mt-16 pb-8 text-center text-xs text-gray-400">
        Powered by GPT-4o mini · Results are suggestions only
      </footer>
    </div>
  );
}
