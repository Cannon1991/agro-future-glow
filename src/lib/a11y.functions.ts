import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SUITE_IDS = [
  "interactive_demo",
  "keyboard_nav",
  "keyboard_320",
  "contrast_landmarks",
  "contrast_narrow",
  "landmarks_narrow",
  "reduced_motion",
  "live_regions",
  "reflow_zoom",
  "mobile_page",
  "tablet_desktop",
] as const;

export type RunResult = {
  ok: boolean;
  suiteId: string;
  command: string;
  /** Trimmed tail of the runner output, when it could actually run. */
  output?: string;
  /** Present when the environment cannot spawn the test runner. */
  unavailable?: string;
};

/**
 * Re-runs a single a11y suite via tests/a11y/run_all.py.
 * Only possible where the server can spawn a process (local dev on Node);
 * on the edge runtime we return a clear "run it yourself" message instead.
 */
export const runA11ySuite = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ suiteId: z.enum(SUITE_IDS) }).parse(data))
  .handler(async ({ data }): Promise<RunResult> => {
    const command = `python3 tests/a11y/run_all.py ${data.suiteId}`;
    try {
      const { execFile } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const run = promisify(execFile);
      const { stdout, stderr } = await run(
        "python3",
        ["tests/a11y/run_all.py", data.suiteId],
        { cwd: process.cwd(), timeout: 300_000, maxBuffer: 8 * 1024 * 1024 },
      );
      const output = `${stdout}\n${stderr}`.trim();
      return { ok: !/\bFAIL\b|✗/.test(output), suiteId: data.suiteId, command, output: output.slice(-6000) };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // A real test failure exits non-zero but still produced output.
      const out = (err as { stdout?: string; stderr?: string } | null) ?? null;
      const combined = `${out?.stdout ?? ""}\n${out?.stderr ?? ""}`.trim();
      if (combined) {
        return { ok: false, suiteId: data.suiteId, command, output: combined.slice(-6000) };
      }
      return {
        ok: false,
        suiteId: data.suiteId,
        command,
        unavailable: `This environment can't start the test runner (${message.slice(0, 160)}). Run the command below yourself, then press Refresh.`,
      };
    }
  });
