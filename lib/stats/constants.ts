import { GAME_TARGET_SCORE } from "@/lib/scoring";

/** Koliko zajedničkih partija treba da se kemija para prestane stiskati prema 0. */
export const CHEMISTRY_SHRINK_GAMES = 6;
/** Ispod ovoga igrač/par ne ulazi u glavni poredak, nego u odvojenu sekciju. */
export const PROVISIONAL_PLAYER_GAMES = 15;
export const PROVISIONAL_PAIR_GAMES = 10;
/** Završnica partije: netko je blizu cilja, a razlika je još nadoknadiva. */
export const CLUTCH_LEAD_THRESHOLD = 0.7 * GAME_TARGET_SCORE;
export const CLUTCH_MARGIN_THRESHOLD = 0.15 * GAME_TARGET_SCORE;
export const HEAD_TO_HEAD_MIN_GAMES = 3;
export const BEST_PARTNER_MIN_GAMES = 3;
/** Promjena rejtinga (kroz zadnjih 10 partija) koja se računa kao forma. */
export const TREND_THRESHOLD = 12;
