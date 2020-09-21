// import

const path = require('path');

const withMDX = require('@next/mdx');
const R = require('ramda');

// vars

const mdxMatterLoader = path.resolve(__dirname, '../libs/mdxMatterLoader.js');

// fns

const pathAppend = (loc, bit, obj) =>
  R.over(R.lensPath(loc), R.append(bit), obj);

// export

module.exports = function withMdx(mdxCfg = {}) {
  const {
    remarkPlugins = [],
    rehypePlugins = [],
    ...nextCfg
  } = mdxCfg;

  return withMDX({
    extension: /\.mdx?$/,
    options: {remarkPlugins, rehypePlugins},
  })({
    ...nextCfg,

    webpack(cfg, opts) {
      cfg = pathAppend(
        ['module', 'rules', 1, 'use'],
        mdxMatterLoader,
        cfg,
      );

      return R.is(Function, nextCfg.webpack) ?
        nextCfg.webpack(cfg, opts) :
        cfg;
    },
  });
};

