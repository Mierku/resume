/** @type {import("prettier").Config} */
module.exports = {
  printWidth: 200,
  tabWidth: 2,
  useTabs: false,

  semi: true,
  singleQuote: false,
  jsxSingleQuote: false,
  quoteProps: "as-needed",

  trailingComma: "all",
  bracketSpacing: true,
  bracketSameLine: false,

  arrowParens: "always",
  endOfLine: "lf",

  // 对 TS/TSX 更友好
  singleAttributePerLine: false,

  // Markdown / 文字
  proseWrap: "preserve",

  // 如果你用 Tailwind，可打开并安装 prettier-plugin-tailwindcss
  // plugins: ["prettier-plugin-tailwindcss"],

  overrides: [
    {
      files: "*.json",
      options: { printWidth: 120 },
    },
    {
      files: ["*.md", "*.mdx"],
      options: { printWidth: 100 },
    },
  ],
  plugins: ['prettier-plugin-unocss'],
};
