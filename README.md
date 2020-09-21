# @sitearcade/next-plugins

This is a collection of next plugins.

## Installation

1. `npm i -D @sitearcade/next-plugins`
2. Add to `next.config.js`:

```js
const {withArcade} = require('@sitearcade/next-plugin');

module.exports = withArcade({
  target: 'serverless',
});
```

## Plugins

* `withArcade` adds a ton of basics.
* `withMdx` adds MDX support with head yaml.
