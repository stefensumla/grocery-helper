"use client";

import { useState } from "react";

export interface FormData {
  numberOfPeople: number;
  dailyCalories: number;
  dietaryRestrictions: string;
  cuisinePreferences: string;
  itemsAtHome: string;
}

interface MealPlanFormProps {
  onSubmit: (data: FormData) => void;
  isLoading: boolean;
}

const CUISINE_OPTIONS = [
  "Italian",
  "Mexican",
  "Asian",
  "Mediterranean",
  "American",
  "Indian",
  "Middle Eastern",
  "Greek",
];

export default function MealPlanForm({ onSubmit, isLoading }: MealPlanFormProps) {
  const [numberOfPeople, setNumberOfPeople] = useState(2);
  const [dailyCalories, setDailyCalories] = useState(2000);
  const [dietaryRestrictions, setDietaryRestrictions] = useState("");
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [cuisineOther, setCuisineOther] = useState("");
  const [itemsAtHome, setItemsAtHome] = useState("");

  function toggleCuisine(cuisine: string) {
    setSelectedCuisines((prev) =>
      prev.includes(cuisine) ? prev.filter((c) => c !== cuisine) : [...prev, cuisine]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cuisinePreferences = [
      ...selectedCuisines,
      ...(cuisineOther.trim() ? [cuisineOther.trim()] : []),
    ].join(", ");

    onSubmit({
      numberOfPeople,
      dailyCalories,
      dietaryRestrictions,
      cuisinePreferences: cuisinePreferences || "No preference",
      itemsAtHome,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* People & Calories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Number of People
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={numberOfPeople}
            onChange={(e) => setNumberOfPeople(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Daily Calories per Person
          </label>
          <input
            type="number"
            min={800}
            max={5000}
            step={50}
            value={dailyCalories}
            onChange={(e) => setDailyCalories(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            required
          />
        </div>
      </div>

      {/* Dietary Restrictions */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Dietary Restrictions
        </label>
        <input
          type="text"
          placeholder="e.g. no pork, lactose intolerant, nut allergy…"
          value={dietaryRestrictions}
          onChange={(e) => setDietaryRestrictions(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      {/* Cuisine Preferences */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Cuisine Preferences
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {CUISINE_OPTIONS.map((cuisine) => (
            <button
              key={cuisine}
              type="button"
              onClick={() => toggleCuisine(cuisine)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                selectedCuisines.includes(cuisine)
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cuisine}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Other (e.g. Thai, Ethiopian…)"
          value={cuisineOther}
          onChange={(e) => setCuisineOther(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      {/* Items at Home */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Items Already at Home
        </label>
        <textarea
          rows={3}
          placeholder="e.g. rice, olive oil, garlic, canned tomatoes, pasta…"
          value={itemsAtHome}
          onChange={(e) => setItemsAtHome(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 resize-none"
        />
        <p className="mt-1 text-xs text-gray-400">
          These will be excluded from the shopping list.
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLoading ? "Generating your meal plan…" : "Generate Meal Plan"}
      </button>
    </form>
  );
}
