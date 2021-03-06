/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

const path = require('path');
const webpack = require('webpack');

module.exports = {
  devServer: {
    hot: true,
    open: true,
    overlay: true,
    stats: {
      chunks: false,
    },
  },
  devtool: 'cheap-module-source-map',
  entry: {
    client: `${__dirname}/dist/commonjs/Client.js`,
    demo: `${__dirname}/src/demo/demo.js`,
    test: `${__dirname}/src/test/browser/index.js`,
  },
  externals: {
    'fs-extra': '{}',
  },
  module: {
    rules: [
      {
        exclude: /(node_modules)/,
        test: /\.jsx?$/,
        use: [
          {
            loader: 'babel-loader',
          },
        ],
      },
    ],
  },
  output: {
    filename: `dist/[name].js`,
    publicPath: '/',
  },
  plugins: [new webpack.HotModuleReplacementPlugin()],
  resolve: {
    alias: {
      '@wireapp/react-ui-kit': path.resolve(__dirname, '..', 'react-ui-kit', 'dist'),
    },
  },
};
