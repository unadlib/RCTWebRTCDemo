import path from 'path';

const base = {
  devtool: 'inline-source-map',
  module: {
    preLoaders: [
      {
        test: /\.js$/,
        loader: 'source-map-loader',
      },
    ],
    loaders: [
      {
        test: /\.js$/,
        loaders: ['babel'],
        exclude: /node_modules/,
      },
      {
        test: /\.json$/i,
        loader: 'json',
      },
      {
        test: /\.ogg$/,
        loader: 'file?publicPath=./&name=audio/[name]_[hash].[ext]',
      },
    ],
  },
};

const config = {
  ...base,
  entry: {
    background: [
      path.resolve(__dirname, 'background'),
    ],
    client: [
      path.resolve(__dirname, 'client'),
    ],
  },
  output: {
    path: 'demo-extension-build',
    filename: '[name].js',
    publicPath: '/',
  },
};


export default config;
