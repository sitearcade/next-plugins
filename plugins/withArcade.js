// env

require('@sitearcade/dotenv/lerna');

// import

const path = require('path');

const dotenv = require('@sitearcade/dotenv');
const withSourceMaps = require('@zeit/next-source-maps');
const withWorkers = require('@zeit/next-workers');
const find = require('find-config');
const {DuplicatesPlugin} = require('inspectpack/plugin');
const withPlugins = require('next-compose-plugins');
const withTM = require('next-transpile-modules');
const R = require('ramda');
const {DefinePlugin} = require('webpack');
const {BundleAnalyzerPlugin} = require('webpack-bundle-analyzer');
const {WebpackBundleSizeAnalyzerPlugin} = require('webpack-bundle-size-analyzer');

// vars

const omitEnvRx = /^(?:__|NODE_)/;

const envDir = path.parse(find('lerna.json') || '').dir || undefined;

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

// export

module.exports = function withArcade(nextCfg = {}) {
  return withPlugins([
    withWorkers,
    withSourceMaps,
    withTM(['@arc']),
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
      const {defaultLoaders: {babel}} = opts;

      dotenv.config({
        envDir,
        buildTarget: opts.isServer ? 'server' : 'client',
      });

      cfg = R.assocPath(['node', 'fs'], 'empty', cfg);

      // env

      cfg = pathAppend(['plugins'], new DefinePlugin(dotenv.config()), cfg);

      // svg

      cfg = pathInsert(['module', 'rules', 1], {
        test: /\.svg$/,
        use: [babel, {loader: 'react-svg-loader', options: {jsx: true, inlineStyles: false}}],
      }, cfg);

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
};
