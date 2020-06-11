const os = require('os');
const path = require('path');
const yargs = require('yargs');
const JSON5 = require('json5');
const rimraf = require('rimraf');
const timespan = require('timespan-parser');
const parameter = require('./parameter');
const controller = require('./controller');
const logger = require('./logger')('main');

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
  .config('json', (p) => JSON5.parse(fs.readFileSync(p, 'utf-8')))
  .group(['cwd', 'max-procs', 'xargs', 'one'], 'Program Execution Control:')
  .option('cwd', {
    describe: 'Specify the cwd of the program',
    type: 'string',
  })
  .option('P', {
    alias: 'max-procs',
    default: os.cpus().length,
    describe: 'Run up to max-procs processes concurrently',
    type: 'number',
    requiresArg: 1,
  })
  .option('x', {
    alias: 'xargs',
    describe: 'Parameters are provided to the program using arguments instead of stdin',
    type: 'boolean',
  })
  .option('1', {
    alias: 'one',
    describe: 'At least one parameter is required to run the program',
    type: 'boolean',
  })
  .group(['arg-file', 'in-place', 'split', 'split-by'], 'Debug Parameter Control:')
  .option('a', {
    alias: 'arg-file',
    describe: 'Read parameters from file instead of stdin',
    type: 'string',
  })
  .option('X', {
    alias: 'in-place',
    describe: 'Use the arguments as parameters',
    type: 'boolean',
  })
  .option('s', {
    alias: 'split',
    describe: 'Split parameters when applying to the program',
    type: 'boolean',
  })
  .option('d', {
    alias: 'split-by',
    describe: 'What to use to split a parameter',
    type: 'string',
    requiresArg: 1,
  })
  .implies('split-by', 'split')
  .implies('split', 'xargs')
  .group(['zero', 'non-zero', 'stdout', 'stderr', 'time-limit', 'timeout'], 'Success / Failure / Error Detection:')
  .option('z', {
    alias: 'zero',
    choices: ['ignore', 'fail', 'error'],
    default: 'ignore',
    describe: 'Meaning of getting zero exit code',
    type: 'string',
    requiresArg: 1,
  })
  .option('Z', {
    alias: 'non-zero',
    choices: ['ignore', 'fail', 'error'],
    default: 'fail',
    describe: 'Meaning of getting non-zero exit code',
    type: 'string',
    requiresArg: 1,
  })
  .option('T', {
    alias: 'time-limit',
    describe: 'Maximum execution time (ms, s, m, h, ...)',
    type: 'string',
    requiresArg: 1,
  })
  .option('t', {
    alias: 'timeout',
    choices: ['ignore', 'fail', 'error'],
    default: 'ignore',
    describe: 'Meaning of not quitting before a deadline',
    type: 'string',
    requiresArg: 1,
  })
  .option('O', {
    alias: 'stdout',
    choices: ['ignore', 'fail', 'error'],
    default: 'ignore',
    describe: 'Meaning of getting some output from program to stderr',
    type: 'string',
    requiresArg: 1,
  })
  .option('e', {
    alias: 'stderr',
    choices: ['ignore', 'fail', 'error'],
    default: 'ignore',
    describe: 'Meaning of getting some output from program to stderr',
    type: 'string',
    requiresArg: 1,
  })
  .group(['sup', 'inf', 'exhaust', 'co', 'contra', 'invariant'], 'Searching Strategies and a priori Assumptions:')
  .option('M', {
    alias: ['sup', 'max'],
    describe: 'Search upwards: get largest / supremum subset(s)',
    type: 'boolean',
  })
  .option('m', {
    alias: ['inf', 'min'],
    describe: 'Search downwards: get smallest / infimum subset(s)',
    type: 'boolean',
  })
  .option('c', {
    alias: 'co',
    describe: 'Assume that adding parameter(s) to a successful execution will not fail. \
With --sup, findbug can find a supremum failing subset of parameters, to which \
adding any item(s) will make the program success / error. \
With --inf, findbug can find a infimum successful subset of parameters, from which \
removing any item(s) will make the program fail / error. \
',
    type: 'boolean',
  })
  .option('C', {
    alias: 'contra',
    describe: 'Assume that adding parameter(s) to a failing execution will not succeed. \
With --sup, findbug can find a supremum successful subset of parameters, to which \
adding any item(s) will make the program fail / error. \
With --inf, findbug can find a infimum failing subset of parameters, from which \
removing any item(s) will make the program success / error. \
',
    type: 'boolean',
  })
  .option('F', {
    alias: 'invariant',
    describe: 'Don\'t make assumptions, search the entire parameter space. \
This option cannot be used together with --sup nor --inf. \
',
    type: 'boolean',
  })
  .option('E', {
    alias: 'exhaust',
    describe: 'Find all solutions when using --co / --contra.',
    type: 'boolean',
  })
  .conflicts('exhaust', 'invariant')
  .group(['verbose', 'quiet', 'output', 'log-file', 'prune'], 'Output and Caching Control:')
  .option('v', {
    alias: 'verbose',
    describe: 'Increase verbosity by 1 (maximum verbosity -vvv)',
    type: 'boolean',
  })
  .option('q', {
    alias: 'quiet',
    describe: 'Decrease verbosity by 1 (minimum verbosity -qqqq)',
    type: 'boolean',
  })
  .count(['v', 'q'])
  .option('o', {
    alias: 'output',
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
    if (argv.verbose > 0 && argv.quiet > 0)
      throw new Error('Argument check failed: You cannot specify both of -v and -q');
    argv.verbosity = argv.verbose - argv.quiet;
    return true;
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
    if (!argv.invariant && !(argv.sup || argv.inf))
      throw new Error('Argument check failed: You must specify at least one of --sup or --inf if you use --co or --contra');
    else if (argv.invariant && (argv.sup || argv.inf))
      throw new Error('Argument check failed: You cannot use --sup nor --inf if you use --invariant');
    return true;
  })
  .check((argv) => {
    if (!(argv.zero === 'fail' || argv.nonZero === 'fail' || argv.timeout === 'fail' || argv.stdout === 'fail' || argv.stderr === 'fail'))
      throw new Error('Argument check failed: At least one of --zero, --non-zero, --timeout, --stdout, --stderr need to be \'fail\'');
    if (!argv.timeLimit) {
      if (argv.timeout !== 'ignore')
        throw new Error('Argument check failed: You must specify --time-limit if you\'ve specified --timeout');
      if (argv.zero === 'fail' && argv.nonZero === 'fail')
        throw new Error('Argument check failed: --zero and --non-zero cannot both be \'fail\' when --time-limit is not specified');
      if (argv.zero === 'error' && argv.nonZero === 'error')
        throw new Error('Argument check failed: --zero and --non-zero cannot both be \'error\' when --time-limit is not specified');
    } else if (argv.timeout === 'ignore') {
      throw new Error('Argument check failed: You must not use --timeout=ignore when you\'v specified --time-limit');
    }
    return true;
  })
  .argv;

if (argv.verbosity >= 3) {
  logger.setLevel('trace');
} else if (argv.verbosity >= 2) {
  logger.setLevel('debug');
} else if (argv.verbosity >= 1) {
  logger.setLevel('info');
} else if (argv.verbosity >= 0) {
  logger.setLevel('notice');
} else if (argv.verbosity >= -1) {
  logger.setLevel('warning');
} else if (argv.verbosity >= -2) {
  logger.setLevel('error');
} else if (argv.verbosity >= -3) {
  logger.setLevel('fatal');
} else {
  logger.setLevel(null);
}

if (argv.prune) {
  logger.warning('Pruning the output directory:', argv.o);
  rimraf.sync(argv.o, { disableGlob: true });
  logger.info('Pruned the output directory');
}

if (argv.logFile) {
  logger.useLogFile(path.join(argv.o, argv.logFile));
}

process.on('unhandledRejection', (e) => {
  logger.fatal('Unhandled rejection', e);
});

process.on('uncaughtException', (e) => {
  logger.fatal('Uncaught exception', e);
});

process.on('warning', (e) => {
  logger.warning('Node warning', e);
});

process.on('SIGINT', () => {
  logger.fatal('SIGINT received');
  process.exit(128 + 2);
});

process.on('SIGTERM', () => {
  logger.fatal('SIGTERM received');
  process.exit(128 + 15);
});

module.exports = async () => {
  logger.debug('argv:', argv);

  if (argv.timeLimit) {
    logger.debug('Parsing --time-limit:', argv.timeLimit);
    argv.timeLimit = timespan.parse(argv.timeLimit, 'ms');
    logger.info('--time-limit in millisecond:', argv.timeLimit);
  }

  let pars;
  try {
    pars = await parameter.parse(argv);
    if (!pars.length) {
      logger.fatal('At least one parameter is required');
      return 2;
    }
  } catch (e) {
    logger.fatal('During parameter read:', e);
    return 1;
  }

  if (argv.invariant) {
    await controller.invariant(argv, pars);
  } else if (argv.co) {
    await controller.covariant(argv, pars);
  } else if (argv.contra) {
    await controller.contravariant(argv, pars);
  }

  logger.debug('Exiting...');
  return 0;
};
