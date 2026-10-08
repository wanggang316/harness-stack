import { closeSync, openSync, writeSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { listFeatures } from "./core.js";
import { PlanError } from "./errors.js";
import { featureStatuses, KEBAB } from "./schema.js";

const MAX_EVENT_BYTES = 16 * 1024;
const EventSchema = z
  .object({
    timestamp: z.string().datetime(),
    kind: z.string().regex(KEBAB),
    subject: z
      .string()
      .trim()
      .min(1)
      .regex(/^[^\r\n\x00-\x1f\x7f]+$/),
    message: z.string().trim().min(1),
  })
  .strict();
export type ProgressEvent = z.infer<typeof EventSchema>;
export const eventsPath = (dir: string): string => join(dir, "events.jsonl");

/** One O_APPEND write avoids read/modify/write races between local workers. */
export function logEvent(
  dir: string,
  kind: string,
  subject: string,
  message: string,
): ProgressEvent {
  const parsed = EventSchema.safeParse({
    timestamp: new Date().toISOString(),
    kind,
    subject,
    message,
  });
  if (!parsed.success)
    throw new PlanError("usage", `invalid event: ${parsed.error.message}`);
  const record = Buffer.from(`${JSON.stringify(parsed.data)}\n`, "utf8");
  if (record.length > MAX_EVENT_BYTES)
    throw new PlanError("usage", "event exceeds 16 KiB UTF-8 limit");
  let fd: number | undefined;
  let failure: PlanError | undefined;
  try {
    fd = openSync(eventsPath(dir), "a", 0o600);
    // Do not retry a short append: another process may already have appended.
    if (writeSync(fd, record) !== record.length)
      throw new Error(
        "short event write; inspect events.jsonl before continuing",
      );
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    failure = new PlanError(
      "data",
      `cannot append ${eventsPath(dir)}: ${detail}`,
      { cause },
    );
  } finally {
    if (fd !== undefined) {
      try {
        closeSync(fd);
      } catch (cause) {
        failure ??= new PlanError(
          "data",
          `cannot close ${eventsPath(dir)}; inspect the log before retrying`,
          { cause },
        );
      }
    }
  }
  if (failure !== undefined) throw failure;
  return parsed.data;
}

export async function readEvents(dir: string): Promise<ProgressEvent[]> {
  let raw: string;
  try {
    raw = await readFile(eventsPath(dir), "utf8");
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw new PlanError("data", `cannot read ${eventsPath(dir)}`, { cause });
  }
  if (raw === "") return [];
  if (!raw.endsWith("\n"))
    throw new PlanError("data", "incomplete event record in events.jsonl");
  return raw
    .slice(0, -1)
    .split("\n")
    .map((line, index) => {
      try {
        return EventSchema.parse(JSON.parse(line));
      } catch (cause) {
        throw new PlanError(
          "data",
          `invalid events.jsonl record at line ${index + 1}`,
          { cause },
        );
      }
    });
}

/** Render observed bookkeeping; event age is not proof of worker liveness. */
export async function progressReport(dir: string): Promise<string> {
  const [features, events] = await Promise.all([
    listFeatures(dir),
    readEvents(dir),
  ]);
  const lines = [`Features: ${features.length}`];
  for (const status of featureStatuses) {
    lines.push(
      `  ${status}: ${features.filter((feature) => feature.status === status).length}`,
    );
  }
  const current = features.filter(
    (feature) => feature.status === "in_progress",
  );
  lines.push(
    `Current: ${current.length ? current.map((feature) => `${feature.id} (${feature.milestone})`).join(", ") : "none"}`,
  );
  lines.push(
    `Next pending: ${features.find((feature) => feature.status === "pending")?.id ?? "none"}`,
  );
  lines.push("Recent events (append order, last 10):");
  if (!events.length) lines.push("  none");
  for (const event of events.slice(-10)) {
    lines.push(
      `  ${event.timestamp} ${event.kind} ${event.subject}: ${JSON.stringify(event.message)}`,
    );
  }
  return `${lines.join("\n")}\n`;
}
