import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const verifyScript = path.join(scriptDirectory, "verify-self-test.mjs");
const require = createRequire(import.meta.url);

function parseOptions(argumentsList) {
  const options = {
    executable: "",
    output: ""
  };

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    const equalsIndex = argument.indexOf("=");
    const optionName = equalsIndex >= 0
      ? argument.slice(0, equalsIndex)
      : argument;
    const inlineValue = equalsIndex >= 0
      ? argument.slice(equalsIndex + 1)
      : "";

    if (!["--executable", "--output"].includes(optionName)) {
      throw new Error(`Unknown option: ${argument}`);
    }

    const key = optionName.slice(2);
    const value = inlineValue || argumentsList[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${optionName} requires a path.`);
    }
    if (!inlineValue) {
      index += 1;
    }
    if (options[key]) {
      throw new Error(`${optionName} was provided more than once.`);
    }
    options[key] = path.resolve(value);
  }

  return options;
}

function supportedSignals() {
  return process.platform === "win32"
    ? ["SIGINT", "SIGTERM", "SIGBREAK"]
    : ["SIGINT", "SIGTERM", "SIGHUP"];
}

function runCommand(command, argumentsList) {
  return new Promise((resolve, reject) => {
    let receivedSignal = null;
    let settled = false;
    const child = spawn(command, argumentsList, {
      shell: false,
      stdio: "inherit"
    });
    const signalHandlers = new Map();

    const cleanup = () => {
      for (const [signal, handler] of signalHandlers) {
        process.removeListener(signal, handler);
      }
    };

    for (const signal of supportedSignals()) {
      const handler = () => {
        receivedSignal ??= signal;
        try {
          child.kill(signal);
        } catch {
          child.kill();
        }
      };
      signalHandlers.set(signal, handler);
      process.on(signal, handler);
    }

    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    });

    child.once("exit", (code, signal) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({
        code,
        signal: signal ?? receivedSignal
      });
    });
  });
}

function mirrorOutcome(outcome) {
  if (outcome.signal) {
    try {
      process.kill(process.pid, outcome.signal);
    } catch {
      const signalNumber = os.constants.signals[outcome.signal];
      process.exitCode = signalNumber ? 128 + signalNumber : 1;
    }
    return false;
  }

  if (outcome.code !== 0) {
    process.exitCode = Number.isInteger(outcome.code) ? outcome.code : 1;
    return false;
  }

  return true;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const outputDirectory = options.output || await mkdtemp(
    path.join(os.tmpdir(), "webpdf-studio-self-test-")
  );
  const selfTestArgument = `--self-test-output=${outputDirectory}`;

  let executable = options.executable;
  let executableArguments = [selfTestArgument];
  if (!executable) {
    executable = require("electron");
    if (typeof executable !== "string" || !executable) {
      throw new Error("The electron package did not provide an executable path.");
    }
    executableArguments = [projectRoot, selfTestArgument];
  }

  const selfTestOutcome = await runCommand(executable, executableArguments);
  if (!mirrorOutcome(selfTestOutcome)) {
    return;
  }

  const verifyOutcome = await runCommand(process.execPath, [
    verifyScript,
    selfTestArgument
  ]);
  if (!mirrorOutcome(verifyOutcome)) {
    return;
  }

  console.log(`SELF_TEST_RUN_PASS ${outputDirectory}`);
}

main().catch((error) => {
  console.error(`SELF_TEST_RUN_FAIL ${error.message}`);
  process.exitCode = 1;
});
