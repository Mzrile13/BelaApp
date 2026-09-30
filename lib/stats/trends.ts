import { TREND_THRESHOLD } from "./constants";

export function trendFromForm(formDelta: number): "hot" | "steady" | "cold" {
  if (formDelta > TREND_THRESHOLD) return "hot";
  if (formDelta < -TREND_THRESHOLD) return "cold";
  return "steady";
}

export function outcomeLetters(outcomes: number[], count: number): Array<"W" | "L" | "D"> {
  return outcomes.slice(-count).map((outcome) => (outcome > 0 ? "W" : outcome < 0 ? "L" : "D"));
}

export function getCurrentStreak(outcomes: number[]) {
  if (outcomes.length === 0) return 0;
  const last = outcomes[outcomes.length - 1];
  if (last === 0) return 0;
  const sign = last > 0 ? 1 : -1;
  let streak = 0;
  for (let i = outcomes.length - 1; i >= 0; i -= 1) {
    const value = outcomes[i];
    if (value === 0 || (value > 0 ? 1 : -1) !== sign) break;
    streak += 1;
  }
  return sign * streak;
}

export function streakExtremes(outcomes: number[]) {
  let winStreak = 0;
  let lossStreak = 0;
  let bestWinStreak = 0;
  let worstLossStreak = 0;
  for (const outcome of outcomes) {
    if (outcome > 0) {
      winStreak += 1;
      lossStreak = 0;
    } else if (outcome < 0) {
      lossStreak += 1;
      winStreak = 0;
    } else {
      winStreak = 0;
      lossStreak = 0;
    }
    bestWinStreak = Math.max(bestWinStreak, winStreak);
    worstLossStreak = Math.max(worstLossStreak, lossStreak);
  }
  return { bestWinStreak, worstLossStreak };
}
