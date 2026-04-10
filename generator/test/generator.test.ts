import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { GeneratorError } from "../src/errors.js";
import { generate } from "../src/generate.js";

test("generate outputs web json and kmp xml", async () => {
  const fixtureDir = await createFixtureDir();
  const sourceDir = path.join(fixtureDir, "source");
  const distDir = path.join(fixtureDir, "dist");

  await Promise.all([
    writeLocale(
      sourceDir,
      "en",
      `login:
  title: "Login"
  signInText: "Sign In"
welcome:
  message: "Hello & welcome"
`,
    ),
    writeLocale(
      sourceDir,
      "zh-rCN",
      `login:
  title: "登录"
  signInText: "立即登录"
welcome:
  message: "你好 & 欢迎"
`,
    ),
  ]);

  const locales = await generate({ sourceDir, distDir, defaultLocale: "en" });

  assert.equal(locales.length, 2);

  const webEn = JSON.parse(await readFile(path.join(distDir, "web", "en.json"), "utf8")) as Record<
    string,
    string
  >;
  const webZh = JSON.parse(
    await readFile(path.join(distDir, "web", "zh-rCN.json"), "utf8"),
  ) as Record<string, string>;
  const kmpEn = await readFile(path.join(distDir, "kmp", "values", "strings.xml"), "utf8");
  const kmpZh = await readFile(
    path.join(distDir, "kmp", "values-zh-rCN", "strings.xml"),
    "utf8",
  );

  assert.deepEqual(webEn, {
    "login.signInText": "Sign In",
    "login.title": "Login",
    "welcome.message": "Hello & welcome",
  });
  assert.deepEqual(webZh, {
    "login.signInText": "立即登录",
    "login.title": "登录",
    "welcome.message": "你好 & 欢迎",
  });
  assert.match(kmpEn, /<string name="welcome_message">Hello &amp; welcome<\/string>/);
  assert.match(kmpZh, /<string name="login_signInText">立即登录<\/string>/);
});

test("generate throws when locale keys are not aligned", async () => {
  const fixtureDir = await createFixtureDir();
  const sourceDir = path.join(fixtureDir, "source");
  const distDir = path.join(fixtureDir, "dist");

  await Promise.all([
    writeLocale(
      sourceDir,
      "en",
      `login:
  title: "Login"
`,
    ),
    writeLocale(
      sourceDir,
      "zh-rCN",
      `login:
  title: "登录"
  signInText: "立即登录"
`,
    ),
  ]);

  await assert.rejects(
    () => generate({ sourceDir, distDir, defaultLocale: "en" }),
    (error: unknown) => {
      assert.ok(error instanceof GeneratorError);
      assert.match(error.message, /i18n key 对齐校验失败/);
      assert.match(error.message, /语言 en 缺少以下 key/);
      assert.match(error.message, /login\.signInText/);
      return true;
    },
  );
});

test("generate rejects non-string yaml leaf values", async () => {
  const fixtureDir = await createFixtureDir();
  const sourceDir = path.join(fixtureDir, "source");
  const distDir = path.join(fixtureDir, "dist");

  await Promise.all([
    writeLocale(
      sourceDir,
      "en",
      `login:
  title: 123
`,
    ),
    writeLocale(
      sourceDir,
      "zh-rCN",
      `login:
  title: "登录"
`,
    ),
  ]);

  await assert.rejects(
    () => generate({ sourceDir, distDir, defaultLocale: "en" }),
    (error: unknown) => {
      assert.ok(error instanceof GeneratorError);
      assert.match(error.message, /只允许字符串叶子节点/);
      assert.match(error.message, /login\.title/);
      return true;
    },
  );
});

async function createFixtureDir(): Promise<string> {
  const fixtureDir = await mkdtemp(path.join(os.tmpdir(), "i18n-generator-"));
  await mkdir(path.join(fixtureDir, "source"), { recursive: true });
  return fixtureDir;
}

async function writeLocale(sourceDir: string, locale: string, content: string): Promise<void> {
  await writeFile(path.join(sourceDir, `${locale}.yaml`), content, "utf8");
}
