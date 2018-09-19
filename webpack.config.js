const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

if (process.env.NODE_ENV === 'test') {
  require('dotenv').config({ path: '.env.test' });
} else if (process.env.NODE_ENV === 'development') {
  require('dotenv').config({ path: '.env.development' });
}

module.exports = env => {
  const isProduction = env === 'production';
  const CSSExtract = new ExtractTextPlugin('styles.css');

  return {
    entry: path.join(__dirname, 'src/main.js'),
    output: {
      path: path.join(__dirname, 'dist'),
      filename: 'zeroeditor.min.js',
      libraryTarget: 'var',
      libraryExport: 'default',
      library: 'ZEditor',
    },
    resolve: {
      extensions: ['.js', '.json'],
    },
    stats: {
      colors: true,
      reasons: true,
      chunks: true,
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          loader: 'babel-loader',
        },
        {
          test: /\.s?css$/,
          use: CSSExtract.extract({
            use: [
              {
                loader: 'css-loader',
                options: {
                  sourceMap: true,
                },
              },
              {
                loader: 'sass-loader',
                options: {
                  sourceMap: true,
                },
              },
            ],
          }),
        },
      ],
    },
    plugins: [CSSExtract],
    devtool: isProduction ? 'inline-source-map' : false,
    devServer: {
      contentBase: [path.join(__dirname, 'examples'), path.join(__dirname)],
      publicPath: '/dist/',
      watchContentBase: true,
      historyApiFallback: true,
    },
  };
};
