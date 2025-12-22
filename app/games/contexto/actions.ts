"use server";

import { createServerClient } from "@/lib/api";

// Standardized response format
interface ActionResponse<T> {
  data: T | null;
  error: string | null;
}

/**
 * Get today's Contexto word from Encore backend
 */
export async function getTodaysContextoWord(): Promise<ActionResponse<any>> {
  try {
    console.log("🔍 [Contexto Action] Creating server client...");
    const client = createServerClient();

    // Get today's date in DD.MM.YYYY format
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const today = `${day}.${month}.${year}`;

    console.log(`🔍 [Contexto Action] Requesting data for date: ${today}`);
    console.log(`🔍 [Contexto Action] Client base URL: ${client["target"]}`);

    const response = await client.contexto.getContextoWordByDay(today);

    console.log("✅ [Contexto Action] Response received:", {
      date: response.date,
      wordsCount: response.words?.length || 0,
    });

    return {
      data: response,
      error: null,
    };
  } catch (error) {
    console.error(
      "❌ [Contexto Action] Failed to fetch today's contexto word:",
      error
    );
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch today's contexto word",
    };
  }
}

/**
 * Get Contexto word for a specific date
 */
export async function getContextoWordByDate(
  date: string
): Promise<ActionResponse<any>> {
  try {
    const client = createServerClient();

    const response = await client.contexto.getContextoWordByDay(date);

    return {
      data: response,
      error: null,
    };
  } catch (error) {
    console.error(`Failed to fetch contexto word for date ${date}:`, error);
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : `Failed to fetch contexto word for date ${date}`,
    };
  }
}
