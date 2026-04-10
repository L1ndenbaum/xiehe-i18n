import { GeneratorError } from "./errors.js";
import type { FlatMessages, NestedMessages, ParsedLocale } from "./types.js";

export function flattenMessages(
  nested: NestedMessages,
  filePath: string,
  path: string[] = [],
): FlatMessages {
  const result: FlatMessages = {};

  for (const [key, value] of Object.entries(nested)) {
    const nextPath = [...path, key];

    if (typeof value === "string") {
      result[nextPath.join(".")] = value;
      continue;
    }

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new GeneratorError(`${filePath} 包含非法值类型，key=${nextPath.join(".")}`);
    }

    const nestedFlat = flattenMessages(value, filePath, nextPath);

    for (const [nestedKey, nestedValue] of Object.entries(nestedFlat)) {
      result[nestedKey] = nestedValue;
    }
  }

  return result;
}

export function validateLocaleParity(locales: ParsedLocale[]): void {
  const allKeys = new Set<string>();

  for (const locale of locales) {
    for (const key of Object.keys(locale.flat)) {
      allKeys.add(key);
    }
  }

  const sortedKeys = [...allKeys].sort();
  const mismatches = locales
    .map((locale) => {
      const missing = sortedKeys.filter((key) => !(key in locale.flat));
      return { locale, missing };
    })
    .filter((item) => item.missing.length > 0);

  if (mismatches.length === 0) {
    return;
  }

  const details = mismatches
    .map(({ locale, missing }) => {
      const keyLines = missing.map((key) => `  - ${key}`).join("\n");
      return `语言 ${locale.locale} 缺少以下 key（文件: ${locale.filePath}）:\n${keyLines}`;
    })
    .join("\n\n");

  throw new GeneratorError(`i18n key 对齐校验失败。\n\n${details}`);
}
