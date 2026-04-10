import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { GeneratorError } from "./errors.js";
import { flattenMessages, validateLocaleParity } from "./messages.js";
import { writeOutputs } from "./output.js";
import type { GenerateOptions, LocaleFile, ParsedLocale } from "./types.js";
import { parseYamlMessages } from "./yaml.js";

export async function generate(options: GenerateOptions): Promise<ParsedLocale[]> {
  const sourceDir = path.resolve(options.sourceDir);
  const distDir = path.resolve(options.distDir);
  const defaultLocale = options.defaultLocale ?? "en";

  const localeFiles = await loadLocaleFiles(sourceDir);
  const parsedLocales = localeFiles.map(parseLocaleFile).sort((a, b) => a.locale.localeCompare(b.locale));

  validateLocaleParity(parsedLocales);
  await writeOutputs(parsedLocales, { distDir, defaultLocale });

  return parsedLocales;
}

async function loadLocaleFiles(sourceDir: string): Promise<LocaleFile[]> {
  let fileNames: string[];

  try {
    fileNames = await readdir(sourceDir);
  } catch (error) {
    throw new GeneratorError(`无法读取 source 目录: ${sourceDir}\n${formatError(error)}`);
  }

  const localeFiles = fileNames
    .filter((fileName) => fileName.endsWith(".yaml") || fileName.endsWith(".yml"))
    .sort();

  if (localeFiles.length === 0) {
    throw new GeneratorError(`source 目录中没有找到任何 .yaml / .yml 语言文件: ${sourceDir}`);
  }

  return Promise.all(
    localeFiles.map(
      async (fileName) => {
        const filePath = path.join(sourceDir, fileName);
        const content = await readFile(filePath, "utf8");
        return {
          locale: fileName.replace(/\.(yaml|yml)$/i, ""),
          filePath,
          content,
        };
      }
    ),
  );
}

function parseLocaleFile(localeFile: LocaleFile): ParsedLocale {
  const nested = parseYamlMessages(localeFile.content, localeFile.filePath);
  const flat = flattenMessages(nested, localeFile.filePath);

  return {
    locale: localeFile.locale,
    filePath: localeFile.filePath,
    nested,
    flat,
  };
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
