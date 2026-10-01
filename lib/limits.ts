// Granice unosa koje dijele API (zod sheme) i forme. Odvojeno od validation.ts
// da klijentske komponente ne povuku zod u bundle samo zbog jedne konstante.
export const GROUP_NAME_MAX = 40;
