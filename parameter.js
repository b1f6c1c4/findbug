const readline = require('readline');
const fs = require('fs');

module.exports.parse = async ({ argFile, argAsPars }) => {
  let input = process.stdin;
  if (argFile) {
    input = await new Promise((resolve, reject) => {
      const s = fs.createReadStream(argFile);
      s.on('open', () => { resolve(s); });
      s.on('error', reject);
    });
  }
  const rl = readline.createInterface({
    input,
  });
  return new Promise((resolve) => {
    const res = [];
    rl.on('line', (line) => { res.push(line); });
    rl.on('end', () => { resolve(res); });
  });
};
