import type { Configuration } from "webpack";
const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

const outputPath = "dist";

const config: Configuration = {
  entry: {
    background: [
      path.resolve(__dirname, "src", "background.ts")
    ],
    contentLoader: [
      path.resolve(__dirname, "src", "contentLoader.ts")
    ],
    popup: [
      path.resolve(__dirname, "src", "popup.ts")
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: ".", to: ".", context: "public" }
      ]
    })
  ],
  optimization: {
    minimize: false
  }
};

module.exports = config;