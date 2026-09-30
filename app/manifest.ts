import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bela Tracker",
    short_name: "Bela",
    description: "Praćenje rezultata i naprednih statistika za belot",
    lang: "hr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#082f24",
    theme_color: "#082f24",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Nova partija", url: "/new-game" },
      { name: "Ljestvica", url: "/leaderboard" },
    ],
  };
}
