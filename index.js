const yargs = require('yargs');
const JSON5 = require('json5');

const argv = yargs
  .scriptName('findbug')
  .parserConfiguration({
    'halt-at-non-option': true,
  })
  .usage('$0 [<options>] [--] <program> [<args>...]')
  .strict()
  .help('h')
  .alias('h', 'help')
  .showHelpOnFail(false, 'Hint: You may need this: findbug --help')
  .version()
  .option('c', {
    alias: 'config',
    describe: 'Read options from the JSON5 config file',
  })
  .config('c', (p) => JSON5.parse(fs.readFileSync(p, 'utf-8')))
  .group(['C', 'P', 'xargs'], 'Program Execution Control:')
  .option('C', {
    describe: 'Specify the cwd of the program',
    type: 'string',
  })
  .option('P', {
    alias: 'max-procs',
    default: 1,
    describe: 'Run up to max-procs processes at a time',
    type: 'number',
    required: true,
    requiresArg: 1,
  })
  .option('xargs', {
    describe: 'Parameters are provided to the program using arguments instead of stdin',
    type: 'boolean',
  })
  .group(['a', 'args-as-pars', 'split', 'split-by'], 'Debug Parameter Control:')
  .option('a', {
    alias: 'arg-file',
    describe: 'Read parameters from file instead of stdin',
    type: 'string',
  })
  .option('args-as-pars', {
    describe: 'Use the arguments as parameters',
    type: 'boolean',
  })
  .option('split', {
    describe: 'Split parameters when applying to the program',
    type: 'boolean',
  })
  .option('split-by', {
    describe: 'What to use to split a parameter',
    type: 'string',
    requiresArg: 1,
  })
  .implies('split-by', 'split')
  .conflicts('a', 'self')
  .group(['zero', 'non-zero', 'stdout', 'stderr'], 'Success / Failure / Error Detection:')
  .option('zero', {
    choices: ['ignore', 'fail', 'error'],
    default: 'ignore',
    describe: 'Meaning of getting zero exit code',
    type: 'string',
    requiresArg: 1,
  })
  .option('non-zero', {
    choices: ['ignore', 'fail', 'error'],
    default: 'fail',
    describe: 'Meaning of getting non-zero exit code',
    type: 'string',
    requiresArg: 1,
  })
  .option('stdout', {
    choices: ['ignore', 'fail', 'error'],
    default: 'ignore',
    describe: 'Meaning of getting some output from program to stderr',
    type: 'string',
    requiresArg: 1,
  })
  .option('stderr', {
    choices: ['ignore', 'fail', 'error'],
    default: 'ignore',
    describe: 'Meaning of getting some output from program to stderr',
    type: 'string',
    requiresArg: 1,
  })
  .group(['co', 'contra', 'invariant'], 'A Priori Assumptions for Success and Failures:')
  .option('co', {
    describe: 'Adding parameter(s) to a successful execution will not fail',
    type: 'boolean',
  })
  .option('contra', {
    describe: 'Adding parameter(s) to a failing execution will not suceed',
    type: 'boolean',
  })
  .option('invariant', {
    describe: 'Neither of the previous two assumptions hold',
    type: 'boolean',
  })
  .group(['v', 'o', 'log-file', 'prune'], 'Output and Caching Control:')
  .option('v', {
    alias: 'verbose',
    describe: 'Print intermediate steps, can be repeated',
    type: 'boolean',
  })
  .count('v')
  .option('o', {
    default: '.findbug-work',
    describe: 'A directory to store program outputs, also used as cache',
    type: 'string',
  })
  .option('log-file', {
    default: 'findbug.log',
    describe: 'Location of the append-only execution log, relative to the output directory',
    type: 'string',
  })
  .option('prune', {
    describe: 'Remove the entire output directory before proceed',
    type: 'boolean',
  })
  .check((argv) => {
    const p = argv['--'];
    if (!p) {
      yargs.showHelp();
      throw new Error('Argument check failed: You didn\'t specify a program');
    }
    if (!p[0])
      throw new Error('Argument check failed: You didn\'t specify a valid program');
    const [program, ...args] = p;
    argv.program = program;
    argv.args = args;
    p.length = 0;
    return true;
  })
  .check((argv) => {
    if (argv.split && argv.splitBy === undefined)
      argv.splitBy = ' ';
    return true;
  })
  .check((argv) => {
    let i = 0;
    if (argv.co) i++;
    if (argv.contra) i++;
    if (argv.invariant) i++;
    if (i !== 1)
      throw new Error('Argument check failed: You must specify exactly one of --co, --contra, or --invariant');
    return true;
  })
  .check((argv) => {
    if (!(argv.zero === 'fail' || argv.nonZero === 'fail' || argv.stdout === 'fail' || argv.stderr === 'fail'))
      throw new Error('Argument check failed: At least one of --zero, --non-zero, --stdout, --stderr need to be \'fail\'');
    if (argv.zero === 'fail' && argv.nonZero === 'fail')
      throw new Error('Argument check failed: --zero and --non-zero cannot both be \'fail\'');
    if (argv.zero === 'error' && argv.nonZero === 'error')
      throw new Error('Argument check failed: --zero and --non-zero cannot both be \'error\'');
    return true;
  })
  .argv;

console.log(argv);
