// env

require('@sitearcade/dotenv/config');

// vars

const omitEnvRx = /^(?:__|NODE_)/;

const omitEnvVars = (env) => Object.keys(env).reduce((acc, k) => {
  if (!omitEnvRx.test(k)) {
    acc[k] = env[k];
  }

  return acc;
}, {});

// export

module.exports = function withArcade(nextCfg = {}) {
  return {
    devIndicators: {autoPrerender: false},
    pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
    poweredByHeader: false,
    productionBrowserSourceMaps: true,
    reactStrictMode: true,
    trailingSlash: false,
    workerLoaderOptions: {inline: 'fallback'},
    webpack5: true,
    future: {
      excludeDefaultMomentLocales: true,
      strictPostcssConfiguration: true,
    },

    ...nextCfg,

    env: {...omitEnvVars(process.env), ...(nextCfg.env || {})},

    webpack(cfg, opts) {
      cfg.resolve.fallback = {
        ...cfg.resolve.fallback || {},
        fs: false,
      };

      // svg

      cfg.module.rules[2] = {
        oneOf: [
          {
            test: /\.svg$/,
            use: ['@svgr/webpack'],
          },
          cfg.module.rules[2],
        ],
      };

      // yaml

      cfg.module.rules.push({
        test: /\.ya?ml$/,
        use: {loader: 'js-yaml-loader', options: {safe: false}},
      });

      // analyze

      if (nextCfg.analyze || process.env.NEXT_ANALYZE) {
        const {DuplicatesPlugin} = require('inspectpack/plugin');
        const {BundleAnalyzerPlugin} = require('webpack-bundle-analyzer');

        cfg.plugins.push(
          new DuplicatesPlugin({verbose: true}),
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            logLevel: 'warn',

            defaultSizes: 'gzip',
            reportFilename: opts.isServer ?
              '../.perf/server.html' :
              './.perf/client.html',

            generateStatsFile: true,
            statsOptions: {source: true},
            statsFilename: opts.isServer ?
              '../.perf/server-stats.json' :
              './.perf/client-stats.json',
          }),
        );
      }

      // profile

      if (nextCfg.profile || process.env.NEXT_PROFILE) {
        cfg.resolve.alias['react-dom'] = 'react-dom/profiling';
        cfg.resolve.alias['scheduler/tracing'] = 'scheduler/tracing-profiling';

        const terser = cfg.optimization.minimizer
          .find((plug) => plug?.options?.terserOptions);

        if (terser) {
          terser.options.terserOptions = {
            ...terser.options.terserOptions,
            keep_classnames: true,
            keep_fnames: true,
          };
        }
      }

      // workers

      cfg.output.globalObject = 'self';
      cfg.module.rules.push({
        test: /\.worker\.(js|ts)$/,
        loader: 'worker-loader',
        options: nextCfg.workerLoaderOptions || {
          name: 'static/[hash].worker.js',
          publicPath: '/_next/',
        },
      });

      // fin

      return typeof nextCfg.webpack === 'function' ?
        nextCfg.webpack(cfg, opts) : cfg;
    },
  };
};
