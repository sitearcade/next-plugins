// env

require('@sitearcade/dotenv');

// import

const withSourceMaps = require('@zeit/next-source-maps');
const withWorkers = require('@zeit/next-workers');
const {DuplicatesPlugin} = require('inspectpack/plugin');
const withPlugins = require('next-compose-plugins');
const R = require('ramda');
const {BundleAnalyzerPlugin} = require('webpack-bundle-analyzer');
const {WebpackBundleSizeAnalyzerPlugin} = require('webpack-bundle-size-analyzer');

// vars

const omitEnvRx = /^(?:__|NODE_)/;

// fns

const pathAppend = (loc, bit, obj) =>
  R.over(R.lensPath(loc), R.append(bit), obj);

const pathInsert = (loc, bit, obj) => R.over(
  R.lensPath(R.init(loc)),
  R.insert(R.last(loc), bit),
  obj,
);

const omitEnvVars = (env) => Object.keys(env).reduce((acc, k) => ({
  ...acc,
  ...(omitEnvRx.test(k) ? {} : {[k]: env[k]}),
}), {});

// plugins

function withArcade(nextCfg = {}) {
  return withPlugins([
    withWorkers,
    withSourceMaps,
  ], {
    ...nextCfg,
    reactStrictMode: true,
    trailingSlash: false,
    poweredByHeader: false,
    pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
    env: {...omitEnvVars(process.env), ...(nextCfg.env || {})},

    devIndicators: {
      autoPrerender: false,
    },

    workerLoaderOptions: {inline: 'fallback'},

    webpack(cfg, opts) {
      cfg = R.assocPath(['node', 'fs'], 'empty', cfg);

      // yaml

      cfg = pathInsert(['module', 'rules', 2], {
        test: /\.ya?ml$/,
        use: {loader: 'js-yaml-loader', options: {safe: false}},
      }, cfg);

      // analyze

      if (nextCfg.analyze || process.env.NEXT_ANALYZE) {
        cfg = pathAppend(
          ['plugins'],
          new DuplicatesPlugin({verbose: true}),
          cfg,
        );

        cfg = pathAppend(
          ['plugins'],
          new WebpackBundleSizeAnalyzerPlugin('stats.txt'),
          cfg,
        );

        cfg = pathAppend(
          ['plugins'],
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            generateStatsFile: true,
            logLevel: 'warn',
          }),
          cfg,
        );
      }

      // profile

      if (nextCfg.profile || process.env.NEXT_PROFILE) {
        cfg = R.assocPath(
          ['resolve', 'alias', 'react-dom$'],
          'react-dom/profiling',
          cfg,
        );

        cfg = R.assocPath(
          ['resolve', 'alias', 'scheduler/tracing'],
          'scheduler/tracing-profiling',
          cfg,
        );
      }

      return R.is(Function, nextCfg.webpack) ?
        nextCfg.webpack(cfg, opts) :
        cfg;
    },
  });
}

// export

module.exports = {withArcade};
