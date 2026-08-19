import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TN MIDI AI Studio",
    short_name: "TN MIDI AI",
    description: "AI-Powered Web MIDI Composer, Synthesizer & Multi-track Visualizer Platform.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0F19",
    theme_color: "#0369a1",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
