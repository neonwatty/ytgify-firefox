const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: {
      background: './src/background/index.ts',
      content: './src/content/index.ts',
      'content-styles': './src/content/styles-entry.ts',
      popup: './src/popup/index.tsx',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true,
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              compilerOptions: {
                noEmit: false
              }
            }
          },
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
            'postcss-loader',
          ],
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@/components': path.resolve(__dirname, 'src/components'),
        '@/lib': path.resolve(__dirname, 'src/lib'),
        '@/hooks': path.resolve(__dirname, 'src/hooks'),
        '@/types': path.resolve(__dirname, 'src/types'),
        '@/utils': path.resolve(__dirname, 'src/utils'),
        '@/processing': path.resolve(__dirname, 'src/processing'),
      },
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: '[name].css',
      }),
      new HtmlWebpackPlugin({
        template: './popup.html',
        filename: 'popup.html',
        chunks: ['popup'],
      }),
      new CopyPlugin({
        patterns: [
          {
            from: 'manifest.json',
            to: 'manifest.json',
          },
          {
            from: 'icons',
            to: 'icons',
            noErrorOnMissing: true,
          },
          {
            from: 'node_modules/gif.js/dist/gif.worker.js',
            to: 'gif.worker.js',
          },
        ],
      }),
    ],
    devtool: isProduction ? false : 'cheap-module-source-map',
    optimization: {
      minimize: isProduction,
    },
  };
};