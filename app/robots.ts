import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL || "https://kartli.org";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/login",
          "/register",
          "/invite/",
          "/legal/imprint",
          "/legal/privacy",
        ],
        disallow: [
          "/kitchen/",
          "/dashboard/",
          "/api/",
          "/profile/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
