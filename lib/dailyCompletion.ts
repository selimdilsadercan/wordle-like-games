// Daily game completion tracking using localStorage

const DAILY_COMPLETION_KEY = "everydle_daily_completion";

export interface DailyCompletion {
  date: string; // YYYY-MM-DD format
  completedGames: string[]; // Array of game IDs
}

// Get today's date in YYYY-MM-DD format
function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

// Get daily completion data
export function getDailyCompletion(): DailyCompletion {
  if (typeof window === "undefined") {
    return { date: getTodayDate(), completedGames: [] };
  }
  
  const stored = localStorage.getItem(DAILY_COMPLETION_KEY);
  if (!stored) {
    return { date: getTodayDate(), completedGames: [] };
  }
  
  try {
    const data: DailyCompletion = JSON.parse(stored);
    
    // Reset if it's a new day
    if (data.date !== getTodayDate()) {
      return { date: getTodayDate(), completedGames: [] };
    }
    
    return data;
  } catch {
    return { date: getTodayDate(), completedGames: [] };
  }
}

// Mark a game as completed for today
export function markGameCompleted(gameId: string): void {
  if (typeof window === "undefined") return;
  
  const completion = getDailyCompletion();
  
  if (!completion.completedGames.includes(gameId)) {
    completion.completedGames.push(gameId);
    completion.date = getTodayDate();
    localStorage.setItem(DAILY_COMPLETION_KEY, JSON.stringify(completion));
  }
}

// Check if a game is completed today
export function isGameCompletedToday(gameId: string): boolean {
  const completion = getDailyCompletion();
  return completion.completedGames.includes(gameId);
}

// Get all completed games for today
export function getCompletedGamesToday(): string[] {
  return getDailyCompletion().completedGames;
}

// Get completion count for today
export function getTodayCompletionCount(): number {
  return getDailyCompletion().completedGames.length;
}
