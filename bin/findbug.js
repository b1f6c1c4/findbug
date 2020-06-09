#!/usr/bin/env node

require('../')().then((c) => {
  setTimeout(() => process.exit(c), 10);
});
