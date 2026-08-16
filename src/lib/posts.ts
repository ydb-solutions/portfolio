export interface Post {
  slug: string;
  title: string;
  blurb: string;
  date: string;
  readingTime: string;
  tags: string[];
}

export const posts: Post[] = [
  {
    slug: "every-fire-on-earth",
    title: "Every fire on Earth, every morning",
    blurb:
      "Building a global thermal-anomaly pipeline on Databricks Free Edition: NASA FIRMS, H3 hexagons, and the 7% bug I nearly shipped.",
    date: "2026-08-15",
    readingTime: "12 min",
    tags: ["Databricks", "dbt", "H3", "Geospatial", "Data Engineering"],
  },
];
