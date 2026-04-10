import path from "node:path";
import { fileURLToPath } from "node:url";

import { GeneratorError } from "./errors.js";
import { generate } from "./generate.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "..", "..");

async function main(): Promise<void> {
  const sourceDir = path.join(repoRoot, "source");
  const distDir = path.join(repoRoot, "dist");

  const locales = await generate({
    sourceDir,
    distDir,
    defaultLocale: "en",
  });

  process.stdout.write(
    `生成完成，共处理 ${locales.length} 个语言文件，输出目录: ${distDir}\n`,
  );
}

main().catch(
  (error: unknown) => {
    if (error instanceof GeneratorError) {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
      return;
    }

    if (error instanceof Error) {
      process.stderr.write(`${error.stack ?? error.message}\n`);
    } else {
      process.stderr.write(`${String(error)}\n`);
    }

    process.exitCode = 1;
  }
);
