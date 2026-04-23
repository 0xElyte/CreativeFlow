import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CreativeFlow",
    short_name: "CreativeFlow",
    description: "Voice-powered creative goal assistant",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0d0f",
    theme_color: "#0d0d0f",
    icons: [
      {
        src: "/flow-logo.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  }
}
