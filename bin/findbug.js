#!/usr/bin/env node

require('../src')().then((c) => {
  setTimeout(() => process.exit(c), 10);
});
