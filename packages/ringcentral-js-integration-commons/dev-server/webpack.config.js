import path from 'path';

const base = {
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        enforce: 'pre',
        test: /node_modules\/.*\.js$/,
        use: 'source-map-loader'
      },
      {
        test: /\.js$/,
        use: ['babel-loader'],
        exclude: /node_modules/,
      },
      {
        test: /\.json$/i,
        use: 'json-loader',
      },
      {
        test: /\.ogg$/,
        use: 'file-loader?publicPath=./build/&name=audio/[name]_[hash].[ext]',
      },
    ]
  },
};

const index = {
  ...base,
  entry: {
    index: [
      path.resolve(__dirname, 'index'),
    ],
    proxy: [
      path.resolve(__dirname, './proxy'),
    ],
    redirect: [
      path.resolve(__dirname, './redirect'),
    ],
  },
  output: {
    path: path.resolve(__dirname, './build'),
    filename: '[name].js',
    publicPath: '/build',
  },
};


export default index;
