import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type { GenerateOptions, ParsedLocale } from "./types.js";

export async function writeOutputs(
  locales: ParsedLocale[],
  options: Required<Pick<GenerateOptions, "distDir" | "defaultLocale">>,
): Promise<void> {
  const webDir = path.join(options.distDir, "web");
  const kmpDir = path.join(options.distDir, "kmp");

  await Promise.all([
    rm(webDir, { recursive: true, force: true }),
    rm(kmpDir, { recursive: true, force: true }),
  ]);

  await Promise.all([mkdir(webDir, { recursive: true }), mkdir(kmpDir, { recursive: true })]);

  for (const locale of locales) {
    const webOutputPath = path.join(webDir, `${locale.locale}.json`);
    await writeFile(webOutputPath, `${JSON.stringify(sortFlatMessages(locale.flat), null, 2)}\n`, "utf8");

    const valuesDirName =
      locale.locale === options.defaultLocale ? "values" : `values-${locale.locale}`;
    const kmpOutputDir = path.join(kmpDir, valuesDirName);
    const kmpOutputPath = path.join(kmpOutputDir, "strings.xml");

    await mkdir(kmpOutputDir, { recursive: true });
    await writeFile(kmpOutputPath, renderAndroidStrings(locale), "utf8");
  }
}

function renderAndroidStrings(locale: ParsedLocale): string {
  const body = Object.entries(locale.flat)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `  <string name="${toAndroidName(key)}">${escapeXml(value)}</string>`)
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${body}\n</resources>\n`;
}

function toAndroidName(key: string): string {
  return key.replaceAll(".", "_");
}

function sortFlatMessages(messages: ParsedLocale["flat"]): ParsedLocale["flat"] {
  return Object.fromEntries(
    Object.entries(messages).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
