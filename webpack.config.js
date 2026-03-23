const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: {
    background: "./src/background.ts",
    content: "./src/content.ts",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
    fallback: {
      path: false,
      fs: false,
      crypto: false,
    },
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "src/manifest.json", to: "manifest.json" },
        { from: "src/styles.css", to: "styles.css" },
        {
          from: "node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm",
          to: "ffmpeg-core.wasm",
        },
        {
          from: "node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js",
          to: "ffmpeg-core.js",
        },
      ],
    }),
  ],
  mode: "production",
  devtool: "source-map",
};
