export interface LocaleFile {
  locale: string;
  filePath: string;
  content: string;
}

export interface ParsedLocale {
  locale: string;
  filePath: string;
  nested: NestedMessages;
  flat: FlatMessages;
}

export interface GenerateOptions {
  sourceDir: string;
  distDir: string;
  defaultLocale?: string;
}

export interface NestedMessages {
  [key: string]: NestedMessages | string;
}

export type FlatMessages = Record<string, string>;
