// User stars management using localStorage

const STARS_KEY = "everydle_user_stars";
const DAILY_REWARD_KEY = "everydle_daily_reward_date";

export interface UserStars {
  stars: number;
  lastUpdated: string;
}

// Get user stars from localStorage
export function getUserStars(): number {
  if (typeof window === "undefined") return 0;
  
  const stored = localStorage.getItem(STARS_KEY);
  if (!stored) {
    // Initialize with 100 stars for new users
    setUserStars(100);
    return 100;
  }
  
  try {
    const data: UserStars = JSON.parse(stored);
    return data.stars;
  } catch {
    return 0;
  }
}

// Set user stars
export function setUserStars(stars: number): void {
  if (typeof window === "undefined") return;
  
  const data: UserStars = {
    stars: Math.max(0, stars),
    lastUpdated: new Date().toISOString(),
  };
  
  localStorage.setItem(STARS_KEY, JSON.stringify(data));
}

// Add stars to user
export function addStars(amount: number): number {
  const current = getUserStars();
  const newTotal = current + amount;
  setUserStars(newTotal);
  return newTotal;
}

// Remove stars from user (returns false if not enough stars)
export function removeStars(amount: number): boolean {
  const current = getUserStars();
  if (current < amount) return false;
  
  setUserStars(current - amount);
  return true;
}

// Check if user has enough stars
export function hasEnoughStars(amount: number): boolean {
  return getUserStars() >= amount;
}

// Check if daily reward is available
export function canClaimDailyReward(): boolean {
  if (typeof window === "undefined") return false;
  
  const lastClaim = localStorage.getItem(DAILY_REWARD_KEY);
  if (!lastClaim) return true;
  
  const lastDate = new Date(lastClaim).toDateString();
  const today = new Date().toDateString();
  
  return lastDate !== today;
}

// Claim daily reward
export function claimDailyReward(): number {
  if (!canClaimDailyReward()) return 0;
  
  const reward = 50;
  addStars(reward);
  
  if (typeof window !== "undefined") {
    localStorage.setItem(DAILY_REWARD_KEY, new Date().toISOString());
  }
  
  return reward;
}

// Get daily reward streak (how many consecutive days)
export function getDailyStreak(): number {
  // For now, return 1 - can be expanded later
  return 1;
}
