module.exports = {
  root: true,
  extends: ["next/core-web-vitals"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: [
              "@lore/api",
              "@lore/api/*",
              "apps/api/*",
              "../api/*",
              "../../api/*",
              "../../../api/*"
            ],
            message: "UI import barrier: do not import from apps/api. Use src/repos/* seam only."
          },
          {
            group: ["@/api/*", "@/server/*"],
            message: "UI import barrier: do not import direct API clients. Use src/repos/* seam only."
          }
        ]
      }
    ]
  }
};

