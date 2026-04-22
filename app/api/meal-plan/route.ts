import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type IngredientCategory = "Produce" | "Protein" | "Dairy" | "Grains/Pantry" | "Frozen" | "Other";

export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  category: IngredientCategory;
}

export interface Meal {
  name: string;
  ingredients: Ingredient[];
  calories: number;
  prep_note: string;
}

export interface DayPlan {
  day: string;
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
}

export interface ShoppingTrip {
  trip_label: string;
  days_covered: string[];
  categories: Record<string, string[]>;
}

export interface MealPlanResponse {
  meals: DayPlan[];
  shopping_trips: ShoppingTrip[];
  total_weekly_calories: number;
}

// ─── Shopping trip derivation ────────────────────────────────────────────────

const TRIP_CONFIGS = [
  {
    label: "Trip 1 — Sunday pre-week shop",
    days: ["Monday", "Tuesday", "Wednesday", "Thursday"],
  },
  {
    label: "Trip 2 — Thursday mid-week shop",
    days: ["Friday", "Saturday", "Sunday"],
  },
];

const ALL_CATEGORIES: IngredientCategory[] = [
  "Produce", "Protein", "Dairy", "Grains/Pantry", "Frozen", "Other",
];

// Pantry-type categories: if the same item is needed in both trips, buy it all upfront in Trip 1
const CONSOLIDATE_CATEGORIES = new Set<IngredientCategory>(["Grains/Pantry", "Other"]);

type AggMap = Map<string, { name: string; quantity: number; unit: string; category: IngredientCategory }>;

function buildAgg(meals: DayPlan[], days: string[], excludedItems: string[]): AggMap {
  const isExcluded = (name: string) => {
    const lower = name.toLowerCase();
    return excludedItems.some((ex) => lower.includes(ex) || ex.includes(lower));
  };

  const agg: AggMap = new Map();

  for (const dayPlan of meals) {
    if (!days.includes(dayPlan.day)) continue;
    for (const meal of [dayPlan.breakfast, dayPlan.lunch, dayPlan.dinner]) {
      for (const ing of meal.ingredients) {
        if (isExcluded(ing.name)) continue;
        const key = `${ing.name.toLowerCase()}__${ing.unit}`;
        const existing = agg.get(key);
        if (existing) {
          existing.quantity += ing.quantity;
        } else {
          agg.set(key, {
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            category: ALL_CATEGORIES.includes(ing.category) ? ing.category : "Other",
          });
        }
      }
    }
  }

  return agg;
}

function formatShoppingItem(name: string, quantity: number, unit: string): string {
  const qty = Math.round(quantity * 10) / 10;
  if (unit === "piece" || unit === "pieces" || unit === "whole") {
    return qty === 1 ? `${name} (1)` : `${name} (×${qty})`;
  }
  return `${name} (${qty} ${unit})`;
}

function aggToTrip(
  label: string,
  days: string[],
  agg: AggMap
): ShoppingTrip {
  const categories: Record<string, string[]> = Object.fromEntries(
    ALL_CATEGORIES.map((c) => [c, [] as string[]])
  );

  for (const { name, quantity, unit, category } of agg.values()) {
    categories[category].push(formatShoppingItem(name, quantity, unit));
  }

  return { trip_label: label, days_covered: days, categories };
}

function deriveShoppingTrips(meals: DayPlan[], excludedItems: string[]): ShoppingTrip[] {
  const [t1Config, t2Config] = TRIP_CONFIGS;

  const agg1 = buildAgg(meals, t1Config.days, excludedItems);
  const agg2 = buildAgg(meals, t2Config.days, excludedItems);

  // Consolidate pantry staples: if same item appears in both trips, fold it into Trip 1
  for (const [key, data] of agg2) {
    if (agg1.has(key) && CONSOLIDATE_CATEGORIES.has(data.category)) {
      agg1.get(key)!.quantity += data.quantity;
      agg2.delete(key);
    }
  }

  return [
    aggToTrip(t1Config.label, t1Config.days, agg1),
    aggToTrip(t2Config.label, t2Config.days, agg2),
  ];
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { numberOfPeople, dailyCalories, dietaryRestrictions, cuisinePreferences, itemsAtHome } =
      await req.json();

    if (!numberOfPeople || !dailyCalories) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const excludedItems: string[] = itemsAtHome
      ? itemsAtHome
          .split(/[,\n]+/)
          .map((s: string) => s.trim().toLowerCase())
          .filter(Boolean)
      : [];

    const excludedSection = excludedItems.length > 0
      ? `ITEMS THE USER ALREADY HAS AT HOME — do NOT include any of these as ingredients in any meal:\n${excludedItems.map((i) => `  • ${i}`).join("\n")}\n`
      : "";

    const prompt = `You are a professional meal planner and nutritionist. Create a 7-day meal plan with breakfast, lunch, and dinner each day for ${numberOfPeople} ${numberOfPeople === 1 ? "person" : "people"}.

${excludedSection}Requirements:
- Total daily calories per person should be approximately ${dailyCalories} kcal, distributed across the three meals (roughly 25% breakfast, 35% lunch, 40% dinner).
- Dietary restrictions: ${dietaryRestrictions || "none"}.
- Cuisine preferences: ${cuisinePreferences}.
- Scale ALL ingredient quantities for ${numberOfPeople} ${numberOfPeople === 1 ? "person" : "people"}.
- Every ingredient MUST have a numeric quantity, a unit, and a category. Use standard units: g, kg, ml, L, tbsp, tsp, cup, piece.
- Use the same unit consistently for the same ingredient across all meals (e.g. always "g" for chicken, never mix "g" and "kg").
- Assign each ingredient exactly one category: "Produce", "Protein", "Dairy", "Grains/Pantry", "Frozen", or "Other".

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "meals": [
    {
      "day": "Monday",
      "breakfast": {
        "name": "Scrambled eggs with toast",
        "ingredients": [
          { "name": "eggs", "quantity": 3, "unit": "piece", "category": "Protein" },
          { "name": "sourdough bread", "quantity": 2, "unit": "piece", "category": "Grains/Pantry" },
          { "name": "butter", "quantity": 10, "unit": "g", "category": "Dairy" }
        ],
        "calories": 420,
        "prep_note": "Whisk eggs with a splash of milk for fluffier results."
      },
      "lunch": {
        "name": "Chicken salad",
        "ingredients": [
          { "name": "chicken breast", "quantity": 200, "unit": "g", "category": "Protein" },
          { "name": "mixed greens", "quantity": 80, "unit": "g", "category": "Produce" }
        ],
        "calories": 550,
        "prep_note": "Grill chicken until internal temp reaches 75°C."
      },
      "dinner": {
        "name": "Pasta with tomato sauce",
        "ingredients": [
          { "name": "pasta", "quantity": 150, "unit": "g", "category": "Grains/Pantry" },
          { "name": "tomatoes", "quantity": 200, "unit": "g", "category": "Produce" }
        ],
        "calories": 680,
        "prep_note": "Salt the pasta water generously."
      }
    }
  ],
  "total_weekly_calories": 12000
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      return NextResponse.json({ error: "No response from AI." }, { status: 500 });
    }

    const { meals, total_weekly_calories } = JSON.parse(content);

    const shopping_trips = deriveShoppingTrips(meals, excludedItems);

    const mealPlan: MealPlanResponse = { meals, shopping_trips, total_weekly_calories };
    return NextResponse.json(mealPlan);
  } catch (error) {
    console.error("Meal plan error:", error);
    return NextResponse.json(
      { error: "Failed to generate meal plan. Please try again." },
      { status: 500 }
    );
  }
}
