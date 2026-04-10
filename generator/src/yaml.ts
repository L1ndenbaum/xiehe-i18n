import { isMap, isScalar, LineCounter, parseDocument } from "yaml";
import type { ParsedNode, Scalar, YAMLMap } from "yaml";

import { GeneratorError } from "./errors.js";
import type { NestedMessages } from "./types.js";

export function parseYamlMessages(content: string, filePath: string): NestedMessages {
  const lineCounter = new LineCounter();
  const document = parseDocument(content, {
    lineCounter,
    prettyErrors: false,
    uniqueKeys: true,
  });

  if (document.errors.length > 0) {
    const details = document.errors
      .map((error) => {
        const line = error.linePos?.[0]?.line;
        return line ? `${filePath}:${line} ${error.message}` : `${filePath} ${error.message}`;
      })
      .join("\n");

    throw new GeneratorError(details);
  }

  if (document.contents === null) {
    return {};
  }

  return parseMap(document.contents, filePath, lineCounter, []);
}

function parseMap(
  node: ParsedNode,
  filePath: string,
  lineCounter: LineCounter,
  path: string[],
): NestedMessages {
  if (!isMap(node)) {
    throw new GeneratorError(
      `${formatNodeLocation(filePath, lineCounter, node)} 顶层或中间节点必须是对象映射，当前路径: ${formatPath(path)}`,
    );
  }

  const result: NestedMessages = {};

  for (const item of node.items) {
    const keyNode = item.key;
    const valueNode = item.value;

    if (!isScalar(keyNode) || typeof keyNode.value !== "string" || !keyNode.value.trim()) {
      throw new GeneratorError(
        `${formatNodeLocation(filePath, lineCounter, keyNode)} YAML key 必须是非空字符串，当前路径: ${formatPath(path)}`,
      );
    }

    const key = keyNode.value;
    const nextPath = [...path, key];

    if (valueNode === null) {
      throw new GeneratorError(
        `${formatNodeLocation(filePath, lineCounter, keyNode)} 不允许空值，key=${formatPath(nextPath)}`,
      );
    }

    if (isMap(valueNode)) {
      result[key] = parseMap(valueNode, filePath, lineCounter, nextPath);
      continue;
    }

    if (isScalar(valueNode) && typeof valueNode.value === "string") {
      result[key] = valueNode.value;
      continue;
    }

    throw new GeneratorError(
      `${formatNodeLocation(filePath, lineCounter, valueNode)} 只允许字符串叶子节点，key=${formatPath(nextPath)}`,
    );
  }

  return result;
}

function formatNodeLocation(
  filePath: string,
  lineCounter: LineCounter,
  node: YAMLMap<unknown, unknown> | Scalar<unknown> | ParsedNode,
): string {
  const startOffset = node.range?.[0];

  if (startOffset === undefined) {
    return filePath;
  }

  const position = lineCounter.linePos(startOffset);
  return `${filePath}:${position.line}`;
}

function formatPath(path: string[]): string {
  return path.length > 0 ? path.join(".") : "<root>";
}
