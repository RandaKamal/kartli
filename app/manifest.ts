import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "kartli",
    short_name: "kartli",
    description: "Lean, email-free shared kitchen management and grocery lists.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [],
  };
}
