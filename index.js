const os = require('os');
const path = require('path');
const yargs = require('yargs');
const JSON5 = require('json5');
const rimraf = require('rimraf');
const fs = require('fs');
const timespan = require('timespan-parser');
const mkdirp = require('mkdirp');
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
  .showHelpOnFail(false, 'Hint: You may need this: findbug --help.')
  .version()
  .config('json', (p) => JSON5.parse(fs.readFileSync(p, 'utf-8')))
  .group(['cwd', 'max-procs', 'xargs', 'one'], 'Program Execution Control:')
  .option('cwd', {
    describe: 'Specify the cwd of the program.',
    type: 'string',
  })
  .option('P', {
    alias: 'max-procs',
    default: os.cpus().length,
    describe: 'Run up to max-procs processes concurrently.',
    type: 'number',
    requiresArg: 1,
  })
  .option('x', {
    alias: 'xargs',
    describe: 'Parameters are provided to the program using arguments instead of stdin.',
    type: 'boolean',
  })
  .option('1', {
    alias: 'one',
    describe: 'At least one parameter is required to run the program.',
    type: 'boolean',
  })
  .group(['arg-file', 'in-place', 'split', 'split-by'], 'Debug Parameter Control:')
  .option('a', {
    alias: 'arg-file',
    describe: 'Read parameters from file instead of stdin.',
    type: 'string',
  })
  .option('X', {
    alias: 'in-place',
    describe: 'Use the arguments as parameters.',
    type: 'boolean',
  })
  .option('s', {
    alias: 'split',
    describe: 'Split parameters when applying to the program.',
    type: 'boolean',
  })
  .option('d', {
    alias: 'split-by',
    describe: 'What to use to split a parameter.',
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
    describe: 'Meaning of getting zero exit code.',
    type: 'string',
    requiresArg: 1,
  })
  .option('Z', {
    alias: 'non-zero',
    choices: ['ignore', 'fail', 'error'],
    default: 'fail',
    describe: 'Meaning of getting non-zero exit code.',
    type: 'string',
    requiresArg: 1,
  })
  .option('T', {
    alias: 'time-limit',
    describe: 'Maximum execution time in ms, s, m, h, etc.',
    type: 'string',
    requiresArg: 1,
  })
  .option('t', {
    alias: 'timeout',
    choices: ['ignore', 'fail', 'error'],
    default: 'ignore',
    describe: 'Meaning of not quitting before a deadline.',
    type: 'string',
    requiresArg: 1,
  })
  .option('O', {
    alias: 'stdout',
    choices: ['ignore', 'fail', 'error'],
    default: 'ignore',
    describe: 'Meaning of getting some output from program to stderr.',
    type: 'string',
    requiresArg: 1,
  })
  .option('e', {
    alias: 'stderr',
    choices: ['ignore', 'fail', 'error'],
    default: 'ignore',
    describe: 'Meaning of getting some output from program to stderr.',
    type: 'string',
    requiresArg: 1,
  })
  .group(['sup', 'inf', 'exhaust', 'co', 'contra', 'invariant'], 'Searching Strategies and a priori Assumptions:')
  .option('M', {
    alias: ['sup', 'max'],
    describe: 'Search upwards: Get the largest / supremum subset(s).',
    type: 'boolean',
  })
  .option('m', {
    alias: ['inf', 'min'],
    describe: 'Search downwards: Get the smallest / infimum subset(s).',
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
  .group([
    'verbose',
    'quiet',
    'output',
    'result-file',
    'log-file',
    'cache',
    'record-stdout',
    'record-stderr',
    'truncate',
    'prune',
  ], 'Output and Cache Control:')
  .option('v', {
    alias: 'verbose',
    describe: 'Increase verbosity by 1. Maximum verbosity -vvv.',
    type: 'boolean',
  })
  .option('q', {
    alias: 'quiet',
    describe: 'Decrease verbosity by 1. Minimum verbosity -qqqq.',
    type: 'boolean',
  })
  .count(['v', 'q'])
  .option('n', {
    alias: 'dry-run',
    describe: 'Don\'t run the progam, but check the configurations. ATTENTION: --log-file will still be appended or overwritten.',
    type: 'boolean',
  })
  .option('w', {
    alias: 'output',
    default: '.findbug-work',
    describe: 'A directory to store program outputs, also used as cache. NOT affected by --dry-run. If not exist, will do mkdir -p',
    type: 'string',
  })
  .option('S', {
    alias: 'cache',
    default: true,
    describe: 'Cache the execution result to the output directory. Disabling this will also disable reading cache.',
    type: 'boolean',
  })
  .option('r', {
    alias: 'record-stdout',
    describe: 'Log the stdout of each execution to a separate file in the output directory.',
    type: 'boolean',
  })
  .option('R', {
    alias: 'record-stderr',
    describe: 'Log the stderr of each execution to a separate file in the output directory.',
    type: 'boolean',
  })
  .option('l', {
    alias: 'result-file',
    default: 'findbug.json',
    describe: 'File to store findbug output (override), relative to the output directory.',
    type: 'string',
  })
  .option('L', {
    alias: 'log-file',
    default: 'findbug.log',
    describe: 'File to store findbug log (append-only), relative to the output directory.',
    type: 'string',
  })
  .option('truncate', {
    describe: 'Remove the log file before proceed. IS NOT affected by --dry-run.',
    type: 'boolean',
  })
  .option('prune', {
    describe: 'Remove the entire output directory before proceed.',
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
  .epilog('Choosing between -c/-C/-F as well as -m/-M:')
  .epilog(`
  Use -c if the target program is more likely to fail on small inputs.
    - 'grep' fails if given too few inputs.
    - 'find' fails if given too few starting points.
  Use -C if the target program is more likely to fail on large inputs.
    - 'ls' fails if ANY file is missing.
    - 'gcc' fails if ANY source file contains error.
  Use -F only if you can't use any of the strategies above.
    - 'grep | xargs ls' fails on too few OR too many inputs (assume pipefail).
    - 'bash -c "exit $RANDOM"' is wholly chaotic.

  Use -m if you want to aim small.
    - 'findbug -cm grep' Find minimum inputs on which 'grep' succeed.
    - 'findbug -Cm ls'   Find minimum inputs on which 'ls' fail.
  Use -M if you want to aim large.
    - 'findbug -cM grep' Find maximum inputs on which 'grep' fail.
    - 'findbug -CM ls'   Find maximum inputs on which 'ls' succeed.

  Note: You cannot use -m or -M along with -F.
`)
  .epilog('Examples:')
  .epilog(`
1) findbug -1xXCmE ls A B C

  Find which argument(s) caused 'ls' to fail.

    -xX means to tweak the arguments.
    -1 means don't run 'ls' without any argument.
    -C speeds up findbug drastically by such observation:
        "If 'ls P Q' succeeded, 'ls P' and 'ls Q' will also succeed."
    -m means to aim for smallest failing piece, instead of the vague claim:
        'ls A B C'.
    -E means to exhaust all possible minimal failing piece.
`)
  .epilog(`
2) findbug -a input.txt -cME awk '{ a+=$1; } END { exit !(a > 100); }'

  Solve backpack problem. Line of input.txt are weights (>=0) of the items.
  (Find lines whose sum FAILS to be greater than 100, the more the better.)

    -a input.txt means to tweak the lines of input.txt and pipe to 'awk'.
    -c means:
      "If 'awk' failed for some items, it will also fail for fewer items."
    -M means to aim for largest successful piece (pack as many as possible)
    -E means to find all possible largest solutions.

  Note: Using 'findbug' with 'awk' like this will only give you a list of good parameter sets, but will not help you compare the price of them.
`)
  .epilog(`
3) findbug -a input.txt -CME awk '{ a+=$1; } END { exit !(a <= 100); }

  Same semantics as Example 2), but using -C for findbug. Here -C means:
    "If 'awk' suceeded for some items, using fewer items will also work.
`)
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
  if (argv.dryRun) {
    logger.warning('Would prune the output directory:', argv.output);
  } else {
    logger.warning('Pruning the output directory:', argv.output);
    rimraf.sync(argv.output, { disableGlob: true });
    logger.info('Pruned the output directory');
  }
}

logger.info('Creating the output directory:', argv.output);
mkdirp.sync(argv.output);
logger.debug('Created the output directory:', argv.output);

if (argv.logFile) {
  const pl = path.join(argv.output, argv.logFile);
  if (argv.truncate) {
    logger.warning('Truncating the log file:', pl);
    fs.truncateSync(pl);
    logger.useLogFile(pl);
    logger.info('Truncated the log file:', pl);
  } else {
    logger.info('Attached log file:', pl);
  }
}

const die = (code) => {
  setTimeout(() => {
    logger.fatal('dying with exit code:', code);
    process.exit(code);
  }, 10);
};

process.on('unhandledRejection', (e) => {
  logger.fatal('Unhandled rejection', e);
  die(1);
});

process.on('uncaughtException', (e) => {
  logger.fatal('Uncaught exception', e);
  die(1);
});

process.on('warning', (e) => {
  logger.warning('Node warning', e);
});

process.on('SIGINT', () => {
  logger.fatal('SIGINT received');
  die(128 + 2);
});

process.on('SIGTERM', () => {
  logger.fatal('SIGTERM received');
  die(128 + 15);
});

logger.info('findbug version:', process.env.npm_package_version);
logger.info('CWD:', process.cwd());
logger.trace('system versions:', process.versions);

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
  const overall = (argv.one ? -1 : 0) + 2 ** pars.length;
  logger.notice('Total search space:', overall);

  let result;
  if (argv.invariant) {
    if (argv.dryRun) {
      logger.notice('Would run the invariant searching algorithm');
    } else {
      result = await controller.invariant(argv, pars);
    }
  } else if (argv.co) {
    if (argv.dryRun) {
      logger.notice('Would run the invariant searching algorithm');
    } else {
      result = await controller.covariant(argv, pars);
    }
  } else if (argv.contra) {
    if (argv.dryRun) {
      logger.notice('Would run the invariant searching algorithm');
    } else {
      result = await controller.contravariant(argv, pars);
    }
  }

  const op = path.join(argv.output, argv.resultFile);
  logger.info('Writing to output file:', op);
  await fs.promises.writeFile(op, JSON.stringify(result, null, 2), {
    encoding: 'utf-8',
    mode: '644',
  });

  logger.debug('Exiting...');
  return 0;
};
