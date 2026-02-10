import { runIngestion } from "../lib/ingestion/run";

function parseDateArg(): string | undefined {
  const dateFlagIndex = process.argv.findIndex((arg) => arg === "--date");
  if (dateFlagIndex === -1) {
    return undefined;
  }

  return process.argv[dateFlagIndex + 1];
}

async function main() {
  const date = parseDateArg();
  const result = await runIngestion({
    date,
    triggeredBy: "cli",
  });

  console.log(
    JSON.stringify(
      {
        ok: result.status !== "FAILED",
        ...result,
      },
      null,
      2,
    ),
  );

  if (result.status === "FAILED") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

