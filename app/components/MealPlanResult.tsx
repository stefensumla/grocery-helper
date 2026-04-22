"use client";

import type { MealPlanResponse, Meal, Ingredient, ShoppingTrip } from "@/app/api/meal-plan/route";

const CATEGORY_ICONS: Record<string, string> = {
  Produce: "🥦",
  Protein: "🥩",
  Dairy: "🧀",
  "Grains/Pantry": "🌾",
  Frozen: "🧊",
  Other: "🛒",
};

const MEAL_LABELS: { key: "breakfast" | "lunch" | "dinner"; label: string; color: string }[] = [
  { key: "breakfast", label: "Breakfast", color: "amber" },
  { key: "lunch", label: "Lunch", color: "sky" },
  { key: "dinner", label: "Dinner", color: "emerald" },
];

const MEAL_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  amber: {
    bg: "bg-amber-50",
    text: "text-amber-600",
    border: "border-amber-200",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  sky: {
    bg: "bg-sky-50",
    text: "text-sky-600",
    border: "border-sky-200",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
  },
  emerald: {
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    border: "border-emerald-200",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
};

interface MealCardProps {
  meal: Meal;
  label: string;
  color: string;
}

function formatIngredient(ing: Ingredient): string {
  const qty = Math.round(ing.quantity * 10) / 10;
  if (ing.unit === "piece" || ing.unit === "pieces" || ing.unit === "whole") {
    return qty === 1 ? ing.name : `${ing.name} ×${qty}`;
  }
  return `${ing.name} (${qty} ${ing.unit})`;
}

function MealCard({ meal, label, color }: MealCardProps) {
  const c = MEAL_COLORS[color];
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-4`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`text-xs font-bold uppercase tracking-wide ${c.text}`}>{label}</span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold border ${c.badge}`}>
          {meal.calories} kcal
        </span>
      </div>
      <p className="text-sm font-semibold text-gray-800 mb-2">{meal.name}</p>
      <div className="flex flex-wrap gap-1 mb-2">
        {meal.ingredients.map((ing, i) => (
          <span key={i} className="rounded bg-white/70 px-1.5 py-0.5 text-xs text-gray-600 border border-white">
            {formatIngredient(ing)}
          </span>
        ))}
      </div>
      {meal.prep_note && (
        <p className="text-xs text-gray-500 italic border-t border-white/60 pt-2 mt-1">
          💡 {meal.prep_note}
        </p>
      )}
    </div>
  );
}

interface MealPlanResultProps {
  data: MealPlanResponse;
  onReset: () => void;
}

/**
 * Returns the Sunday before next Monday (i.e. the day before the week starts).
 * Trip 1 is always shopped on this Sunday.
 */
function getPreWeekSunday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilMonday = ((1 - today.getDay() + 7) % 7) || 7;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  const sunday = new Date(nextMonday);
  sunday.setDate(nextMonday.getDate() - 1);
  return sunday;
}

/**
 * Returns the Thursday of the upcoming week.
 * Trip 2 is always shopped on this Thursday.
 */
function getNextWeekThursday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilMonday = ((1 - today.getDay() + 7) % 7) || 7;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  const thursday = new Date(nextMonday);
  thursday.setDate(nextMonday.getDate() + 3);
  return thursday;
}

function formatGCalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function buildCalendarUrl(trip: ShoppingTrip, tripIndex: number): string {
  const eventDate = tripIndex === 0 ? getPreWeekSunday() : getNextWeekThursday();
  const nextDay = new Date(eventDate);
  nextDay.setDate(eventDate.getDate() + 1);

  const dateStr = `${formatGCalDate(eventDate)}/${formatGCalDate(nextDay)}`;

  const listLines = Object.entries(trip.categories)
    .filter(([, items]) => items && items.length > 0)
    .map(([cat, items]) => `${CATEGORY_ICONS[cat] ?? "🛍️"} ${cat}:\n${items.map((i) => `• ${i}`).join("\n")}`)
    .join("\n\n");

  const details = `Shopping list for ${trip.days_covered.join(", ")}:\n\n${listLines}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `🛒 ${trip.trip_label}`,
    dates: dateStr,
    details,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const TRIP_COLORS = [
  { header: "bg-violet-500", badge: "bg-violet-100 text-violet-700 border-violet-200", dot: "bg-violet-400" },
  { header: "bg-sky-500", badge: "bg-sky-100 text-sky-700 border-sky-200", dot: "bg-sky-400" },
  { header: "bg-orange-500", badge: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-400" },
  { header: "bg-pink-500", badge: "bg-pink-100 text-pink-700 border-pink-200", dot: "bg-pink-400" },
  { header: "bg-teal-500", badge: "bg-teal-100 text-teal-700 border-teal-200", dot: "bg-teal-400" },
  { header: "bg-rose-500", badge: "bg-rose-100 text-rose-700 border-rose-200", dot: "bg-rose-400" },
  { header: "bg-indigo-500", badge: "bg-indigo-100 text-indigo-700 border-indigo-200", dot: "bg-indigo-400" },
];

function ShoppingTripCard({ trip, index }: { trip: ShoppingTrip; index: number }) {
  const color = TRIP_COLORS[index % TRIP_COLORS.length];
  const categories = Object.entries(trip.categories).filter(([, items]) => items && items.length > 0);
  const calendarUrl = buildCalendarUrl(trip, index);

  const eventDate = index === 0 ? getPreWeekSunday() : getNextWeekThursday();
  const dateLabel = eventDate.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className={`${color.header} px-4 py-3 flex items-start justify-between gap-2`}>
        <div>
          <p className="text-white font-bold text-sm">{trip.trip_label}</p>
          <p className="text-white/80 text-xs mt-0.5">
            {trip.days_covered.join(" · ")}
          </p>
        </div>
        <a
          href={calendarUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={`Add to Google Calendar — ${dateLabel}`}
          className="shrink-0 flex items-center gap-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors px-2.5 py-1.5 text-white text-xs font-semibold"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-3.5">
            <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm.75-13h-1.5v5.25l4.5 2.7.75-1.23-3.75-2.22V7Z" />
          </svg>
          {dateLabel}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3">
            <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Zm6.5-3c0-.414.336-.75.75-.75h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0V4.06l-3.97 3.97a.75.75 0 0 1-1.06-1.06l3.97-3.97H10.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
          </svg>
        </a>
      </div>
      <div className="p-4">
        {categories.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No items needed for this trip.</p>
        ) : (
          <div className="space-y-3">
            {categories.map(([category, items]) => (
              <div key={category}>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <span>{CATEGORY_ICONS[category] ?? "🛍️"}</span>
                  {category}
                </p>
                <ul className="space-y-1">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className={`size-1.5 rounded-full ${color.dot} shrink-0`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MealPlanResult({ data, onReset }: MealPlanResultProps) {
  const trip1 = data.shopping_trips[0];
  const trip2 = data.shopping_trips[1];

  return (
    <div className="space-y-10">
      {/* Summary banner */}
      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm text-emerald-600 font-medium uppercase tracking-wide">
            Weekly Total
          </p>
          <p className="text-3xl font-bold text-emerald-700">
            {data.total_weekly_calories.toLocaleString()}{" "}
            <span className="text-lg font-semibold">kcal</span>
          </p>
        </div>
        <button
          onClick={onReset}
          className="self-start sm:self-center rounded-lg border border-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
        >
          ← Start Over
        </button>
      </div>

      <section>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Your 7-Day Meal Plan</h2>
        <div className="space-y-4">

          {/* Trip 1 — shown before Monday */}
          {trip1 && (
            <div className="pl-4 border-l-2 border-dashed border-violet-200">
              <p className="text-xs text-violet-500 font-semibold uppercase tracking-wide mb-2 ml-1">
                🛒 Shop on Sunday before the week begins
              </p>
              <ShoppingTripCard trip={trip1} index={0} />
            </div>
          )}

          {data.meals.map((dayPlan, i) => (
            <div key={i} className="space-y-4">
              {/* Day meals card */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-bold text-gray-700 mb-4 pb-2 border-b border-gray-100">
                  {dayPlan.day ?? `Day ${i + 1}`}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {MEAL_LABELS.map(({ key, label, color }) => (
                    <MealCard key={key} meal={dayPlan[key]} label={label} color={color} />
                  ))}
                </div>
              </div>

              {/* Trip 2 — shown after Thursday */}
              {dayPlan.day === "Thursday" && trip2 && (
                <div className="pl-4 border-l-2 border-dashed border-sky-200">
                  <p className="text-xs text-sky-500 font-semibold uppercase tracking-wide mb-2 ml-1">
                    🛒 Shop on Thursday for the rest of the week
                  </p>
                  <ShoppingTripCard trip={trip2} index={1} />
                </div>
              )}
            </div>
          ))}

        </div>
      </section>
    </div>
  );
}
