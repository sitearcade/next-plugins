// import

const R = require('ramda');
const {collect} = require('@linaria/server');
const fs = require('fs-extra');
const {renderToStaticMarkup} = require('react-dom/server');

// vars

const isProd = process.env.NODE_ENV === 'production';

const defs = {
  extension: '.linaria.module.css',
  cacheDirectory: './.cache/linaria',
}

// critical css

const cache = {};

async function collectCss(ctx, linariaOpts = {}) {
  const {extension, cacheDirectory, ...linariaOpts} = R.mergeRight(defs, linariaOpts);
  const originalRenderPage = ctx.renderPage;
  let html = '';
  let css = '';

  ctx.renderPage = () => originalRenderPage({
    enhanceApp: (App) => (props) => {
      const dom = <App {...props} />;
      html = renderToStaticMarkup(dom);

      return dom;
    },
  });
  const initialProps = await NextDocument.getInitialProps(ctx);

  const bareName = `${cacheDirectory}/pages${ctx.pathname}${extension}`;
  const rootName = `${cacheDirectory}/pages${ctx.pathname}/index${extension}`;

  try {
    css = cache[bareName] ?? await fs.readFile(bareName, 'utf8');
  } catch {
    css = await fs.readFile(rootName, 'utf8');
  }

  cache[bareName] = css;

  return collect(html, css);
}

// plugin

function traverse(rules, {extension}) {
  // eslint-disable-next-line fp/no-loops
  for (const rule of rules) {
    if (typeof rule.loader === 'string' && rule.loader.includes('css-loader')) {
      if (
        rule.options &&
        rule.options.modules &&
        typeof rule.options.modules.getLocalIdent === 'function'
      ) {
        const nextGetLocalIdent = rule.options.modules.getLocalIdent;

        rule.options.modules.getLocalIdent = (context, _, exportName, options) => {
          if (context.resourcePath.includes(extension)) {
            return exportName;
          }

          return nextGetLocalIdent(context, _, exportName, options);
        };
      }
    }

    if (typeof rule.use === 'object') {
      traverse(Array.isArray(rule.use) ? rule.use : [rule.use]);
    }

    if (Array.isArray(rule.oneOf)) {
      traverse(rule.oneOf);
    }
  }
}

function withLinaria(linariaOpts = {}) {
  const {extension, cacheDirectory, ...linariaOpts} = R.mergeRight(defs, linariaOpts);

  return (nextCfg) => ({
    ...nextCfg,

    webpack(cfg, opts) {
      traverse(cfg.module.rules, {extension});

      cfg.module.rules.push({
        test: /(?!_app)\.(tsx|ts|jsx|js|mjs|mdx)$/,
        exclude: /node_modules/,
        use: [{
            loader: require.resolve('@linaria/webpack-loader'),
            options: {
              sourceMap: !isProd,
              ...linariaCfg,
              extension,
            },
          }],
      });

      cfg.module.rules.push({
        test: /_app\.(tsx|ts|jsx|js|mjs|mdx)$/,
        exclude: /node_modules/,
        use: [{
            loader: require.resolve('@linaria/webpack-loader'),
            options: {
              sourceMap: !isProd,
              ...linariaCfg,
              extension: '.css',
            },
          }],
      });

      return R.is(Function, nextCfg.webpack) ? 
        nextCfg.webpack(cfg, opts) : cfg;
    },
  })
}

// export

module.exports = {collectCss, withLinaria};