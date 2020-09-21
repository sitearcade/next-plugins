// import

const gm = require('gray-matter');

// export

module.exports = function mdxMatterLoader(raw) {
  const {data, content} = gm(raw, {excerpt: false});
  const json = JSON.stringify(data) || '{}';

  return `export const meta = ${json};\n\n${content}\n`;
};
