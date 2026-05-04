#!/usr/bin/env node
// Fake CLI used by cli.test.ts. Reads stdin to EOF, then either:
// - exits 0 and emits JSON {argv, stdin} on stdout (default), or
// - sleeps FAKE_CLI_SLEEP_MS before emitting (to exercise timeouts), or
// - writes FAKE_CLI_STDERR to stderr and exits FAKE_CLI_EXIT (to exercise
//   non-zero exit classification).

let stdinData = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  stdinData += chunk;
});
process.stdin.on("end", () => {
  const exitCode = process.env.FAKE_CLI_EXIT;
  if (exitCode) {
    process.stderr.write(process.env.FAKE_CLI_STDERR ?? "");
    process.exit(parseInt(exitCode, 10));
  }
  const sleep = parseInt(process.env.FAKE_CLI_SLEEP_MS ?? "0", 10);
  const emit = () => {
    process.stdout.write(
      JSON.stringify({ argv: process.argv.slice(2), stdin: stdinData })
    );
    process.exit(0);
  };
  if (sleep > 0) setTimeout(emit, sleep);
  else emit();
});
