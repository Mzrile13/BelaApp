/** Boja avatara je izvedena iz id-a igrača, pa je ista na svakom ekranu. */
const AVATAR_PALETTE: Array<[string, string]> = [
  ["#e7cd8e", "#10261c"],
  ["#8fbfa4", "#0a1f17"],
  ["#a9b6e0", "#0f1428"],
  ["#e0a9b6", "#28101a"],
  ["#c9d9a0", "#152210"],
  ["#9fd0d0", "#0a2222"],
];

export function avatarFor(id: string): { bg: string; fg: string } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const [bg, fg] = AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
  return { bg, fg };
}

export function initialOf(username: string): string {
  return username.slice(0, 1).toUpperCase();
}
