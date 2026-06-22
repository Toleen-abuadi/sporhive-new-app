const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  ...expoConfig,
  {
    ignores: [
      "dist/*",
      "node_modules/*",
      ".expo/*",
      "android/*",
      "ios/*",
      "build/*"
    ]
  },
  {
    files: [
      "src/components/ui/Button.jsx",
      "src/features/onboarding/screens/EntryDecisionScreen.jsx"
    ],
    rules: {
      "react-hooks/immutability": "off"
    }
  },
  {
    files: [
      "**/*.jsx",
      "**/*.js"
    ],
    rules: {}
  }
]);
