import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("服务端正常渲染粉纸 PDF 首页", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /粉纸 PDF 工具箱/);
  assert.match(html, /把散落的文件/);
  assert.match(html, /文件不上传/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("项目包含本地 PDF 处理与可访问操作", async () => {
  const [tool, packageJson] = await Promise.all([
    readFile(new URL("../app/PdfTool.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.match(packageJson, /"pdf-lib"/);
  assert.match(tool, /PDFDocument\.create\(\)/);
  assert.match(tool, /aria-label=/);
  assert.match(tool, /合并并下载 PDF/);
});
