# findbug

[![npm version](https://img.shields.io/npm/v/findbug.svg?style=flat)](https://www.npmjs.com/package/findbug)
[![npm downloads](https://img.shields.io/npm/dt/findbug.svg?style=flat)](https://www.npmjs.com/package/findbug)
[![npm bundle size](https://img.shields.io/bundlephobia/min/findbug.svg?style=flat)](https://www.npmjs.com/package/findbug)
[![npm license](https://img.shields.io/npm/l/findbug)](https://www.npmjs.com/package/findbug)

> Locate bug(s) for ANY program with YES/NO feedback only.

## TL;DR

Install:
```bash
$ npm install -g findbug
```

Now try this: find which argument(s) caused `ls` to fail:
```bash
$ findbug -1xXCmEqS ls A B C
```

`findbug` works NOT by looking at the output of 'ls';
instead, it works by running `ls A B C`, `ls A B`, `ls B C`, ... and summarize their exit codes.
It seems to be really dumb, but sometimes program errors without ANY useful information.
`findbug` can help you locate the *minimum failing pieces* of code.

- `-1` means don't run `ls` without any argument.
- `-xX` means to tweak the arguments.
- `-C` speeds up findbug drastically by such observation: "If `ls P Q` succeeded, `ls P` and `ls Q` will also succeed."
- `-m` means to aim for smallest failing piece, instead of the vague claim: `ls A B C`.
- `-E` means to exhaust all possible minimal failing piece.
- `-q` means to be quiet.
- `-S` means to produce a nice summary report.

## Usage

```bash
findbug [<options>] [--] <program> [<args>...]

Program Execution Control:
  --cwd            Specify the cwd of the program.                      [string]
  -P, --max-procs  Run up to max-procs processes concurrently.
                                                          [number] [default: 16]
  -x, --xargs      Parameters are provided to the program using arguments
                   instead of stdin.                                   [boolean]
  -1, --one        At least one parameter is required to run the program.
                                                                       [boolean]

Debug Parameter Control:
  -a, --arg-file  Read parameters from file instead of stdin.           [string]
  -X, --in-place  Use the arguments as parameters.                     [boolean]
  -s, --split     Split parameters when applying to the program.       [boolean]
  -d, --split-by  What to use to split a parameter.                     [string]

Success / Failure / Error Detection:
  -z, --zero        Meaning of getting zero exit code.
               [string] [choices: "ignore", "fail", "error"] [default: "ignore"]
  -Z, --non-zero    Meaning of getting non-zero exit code.
                 [string] [choices: "ignore", "fail", "error"] [default: "fail"]
  -O, --stdout      Meaning of getting some output from program to stderr.
               [string] [choices: "ignore", "fail", "error"] [default: "ignore"]
  -e, --stderr      Meaning of getting some output from program to stderr.
               [string] [choices: "ignore", "fail", "error"] [default: "ignore"]
  -T, --time-limit  Maximum execution time in ms, s, m, h, etc.         [string]
  -t, --timeout     Meaning of not quitting before a deadline.
               [string] [choices: "ignore", "fail", "error"] [default: "ignore"]

Searching Strategies and a priori Assumptions:
  -M, --sup, --max  Search upwards: Get the largest / supremum subset(s).
                                                                       [boolean]
  -m, --inf, --min  Search downwards: Get the smallest / infimum subset(s).
                                                                       [boolean]
  -E, --exhaust     Find all solutions when using --co / --contra.     [boolean]
  -c, --co          Assume that adding parameter(s) to a successful execution
                    will not fail. With --sup, findbug can find a supremum
                    failing subset of parameters, to which adding any item(s)
                    will make the program success / error. With --inf, findbug
                    can find a infimum successful subset of parameters, from
                    which removing any item(s) will make the program fail /
                    error.                                             [boolean]
  -C, --contra      Assume that adding parameter(s) to a failing execution will
                    not succeed. With --sup, findbug can find a supremum
                    successful subset of parameters, to which adding any
                    item(s) will make the program fail / error. With --inf,
                    findbug can find a infimum failing subset of parameters,
                    from which removing any item(s) will make the program
                    success / error.                                   [boolean]
  -F, --invariant   Don't make assumptions, search the entire parameter space.
                    This option cannot be used together with --sup nor --inf.
                                                                       [boolean]

Output and Cache Control:
  -v, --verbose        Increase verbosity by 1. Maximum verbosity -vvv.  [count]
  -q, --quiet          Decrease verbosity by 1. Minimum verbosity -qqqq. [count]
  -S, --summary        Write a nice summary report to stdout when finish.
                                                                       [boolean]
  -w, --output         A directory to store program outputs, also used as cache.
                       NOT affected by --dry-run. If not exist, will do mkdir -p
                                             [string] [default: ".findbug-work"]
  -l, --result-file    File to store findbug output (override), relative to the
                       output directory.      [string] [default: "findbug.json"]
  -L, --log-file       File to store findbug log (append-only), relative to the
                       output directory.       [string] [default: "findbug.log"]
  --cache              Cache the execution result to the output directory.
                       Disabling this will also disable reading cache.
                                                       [boolean] [default: true]
  -r, --record-stdout  Log the stdout of each execution to a separate file in
                       the output directory.                           [boolean]
  -R, --record-stderr  Log the stderr of each execution to a separate file in
                       the output directory.                           [boolean]
  --truncate           Remove the log file before proceed. IS NOT affected by
                       --dry-run.                                      [boolean]
  --prune              Remove the entire output directory before proceed.
                                                                       [boolean]

Options:
  -h, --help     Show help                                             [boolean]
  --version      Show version number                                   [boolean]
  --json         Path to JSON config file
  -n, --dry-run  Don't run the progam, but check the configurations. ATTENTION:
                 --log-file will still be appended or overwritten.     [boolean]

Choosing between -c/-C/-F as well as -m/-M:

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
```

## License

MIT
