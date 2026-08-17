"use client";

import { useRef, useState } from "react";

type FileItem = {
  id: string;
  file: File;
  kind: "pdf" | "image";
  pages?: number;
};

const A4 = { width: 595.28, height: 841.89 };
const acceptedExtensions = ["pdf", "jpg", "jpeg", "png", "webp"];

function fileKind(file: File): FileItem["kind"] | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (file.type === "application/pdf" || extension === "pdf") return "pdf";
  if (file.type.startsWith("image/") || acceptedExtensions.includes(extension)) return "image";
  return null;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function imageToPngBytes(file: File) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法读取图片");
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error("图片转换失败")), "image/png"),
  );
  return new Uint8Array(await blob.arrayBuffer());
}

async function watermarkPng(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 260;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法生成水印");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#8b536e";
  context.font = "800 110px Arial, PingFang SC, Microsoft YaHei, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text.slice(0, 24), canvas.width / 2, canvas.height / 2);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error("水印生成失败")), "image/png"),
  );
  return new Uint8Array(await blob.arrayBuffer());
}

export default function PdfTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<FileItem[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [watermark, setWatermark] = useState("");
  const [filename, setFilename] = useState("粉纸合并文件");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function addFiles(files: FileList | File[]) {
    setError("");
    const valid = Array.from(files).filter((file) => fileKind(file));
    if (!valid.length) {
      setError("请选择 PDF、JPG、PNG 或 WebP 文件。");
      return;
    }

    const pdfLib = valid.some((file) => fileKind(file) === "pdf") ? await import("pdf-lib") : null;

    const next = await Promise.all(valid.map(async (file) => {
      const kind = fileKind(file) as FileItem["kind"];
      let pages: number | undefined;
      if (kind === "pdf") {
        try {
          const pdf = await pdfLib!.PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
          pages = pdf.getPageCount();
        } catch {
          pages = undefined;
        }
      }
      return { id: crypto.randomUUID(), file, kind, pages } satisfies FileItem;
    }));
    setItems((current) => [...current, ...next]);
  }

  function move(id: string, direction: -1 | 1) {
    setItems((current) => {
      const index = current.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function dropOn(targetId: string) {
    if (!dragId || dragId === targetId) return;
    setItems((current) => {
      const from = current.findIndex((item) => item.id === dragId);
      const to = current.findIndex((item) => item.id === targetId);
      if (from < 0 || to < 0) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDragId(null);
  }

  async function exportPdf() {
    if (!items.length || busy) return;
    setBusy(true);
    setError("");
    try {
      const { degrees, PDFDocument } = await import("pdf-lib");
      const output = await PDFDocument.create();
      for (const item of items) {
        if (item.kind === "pdf") {
          const source = await PDFDocument.load(await item.file.arrayBuffer(), { ignoreEncryption: true });
          const pages = await output.copyPages(source, source.getPageIndices());
          pages.forEach((page) => output.addPage(page));
        } else {
          const png = await output.embedPng(await imageToPngBytes(item.file));
          const landscape = png.width > png.height;
          const pageWidth = landscape ? A4.height : A4.width;
          const pageHeight = landscape ? A4.width : A4.height;
          const page = output.addPage([pageWidth, pageHeight]);
          const scale = Math.min((pageWidth - 56) / png.width, (pageHeight - 56) / png.height);
          const width = png.width * scale;
          const height = png.height * scale;
          page.drawImage(png, { x: (pageWidth - width) / 2, y: (pageHeight - height) / 2, width, height });
        }
      }

      if (watermark.trim()) {
        const mark = await output.embedPng(await watermarkPng(watermark.trim()));
        for (const page of output.getPages()) {
          const width = page.getWidth() * 0.65;
          const height = width * (mark.height / mark.width);
          page.drawImage(mark, {
            x: (page.getWidth() - width) / 2,
            y: (page.getHeight() - height) / 2,
            width,
            height,
            opacity: 0.17,
            rotate: degrees(-28),
          });
        }
      }

      const bytes = await output.save();
      const blob = new Blob([Uint8Array.from(bytes).buffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${filename.trim() || "合并文件"}.pdf`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) {
      console.error(reason);
      setError("处理失败，可能包含加密或损坏的 PDF，请更换文件后重试。");
    } finally {
      setBusy(false);
    }
  }

  if (!items.length) {
    return (
      <>
        <div
          className="drop-zone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { event.preventDefault(); void addFiles(event.dataTransfer.files); }}
        >
          <div className="file-icon" aria-hidden="true"><span>PDF</span></div>
          <h2>将文件拖到这里</h2>
          <p>支持 PDF、JPG、PNG 和 WebP</p>
          <button type="button" onClick={() => inputRef.current?.click()}>选择文件</button>
          <small>支持多选，文件仅在本机处理</small>
          {error && <div className="error-message" role="alert">{error}</div>}
          <input ref={inputRef} className="visually-hidden" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*" onChange={(event) => event.target.files && void addFiles(event.target.files)} />
        </div>
      </>
    );
  }

  return (
    <div className="tool-panel">
      <div className="tool-heading">
        <div><span className="status-dot" />已添加 {items.length} 个文件</div>
        <button className="add-more" type="button" onClick={() => inputRef.current?.click()}>＋ 继续添加</button>
      </div>
      <div className="file-list" onDragEnd={() => setDragId(null)}>
        {items.map((item, index) => (
          <article
            className="file-row"
            draggable
            key={item.id}
            onDragStart={() => setDragId(item.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => dropOn(item.id)}
          >
            <span className="drag-handle" aria-hidden="true">⠇⠇</span>
            <span className={`type-badge ${item.kind}`}>{item.kind === "pdf" ? "PDF" : "IMG"}</span>
            <div className="file-meta">
              <b title={item.file.name}>{item.file.name}</b>
              <small>{item.pages ? `${item.pages} 页 · ` : ""}{formatBytes(item.file.size)}</small>
            </div>
            <div className="row-actions">
              <button type="button" disabled={index === 0} onClick={() => move(item.id, -1)} aria-label={`上移 ${item.file.name}`}>↑</button>
              <button type="button" disabled={index === items.length - 1} onClick={() => move(item.id, 1)} aria-label={`下移 ${item.file.name}`}>↓</button>
              <button type="button" className="remove" onClick={() => setItems((current) => current.filter(({ id }) => id !== item.id))} aria-label={`删除 ${item.file.name}`}>×</button>
            </div>
          </article>
        ))}
      </div>
      <div className="export-settings">
        <label><span>导出文件名</span><input value={filename} maxLength={60} onChange={(event) => setFilename(event.target.value)} /></label>
        <label><span>文字水印 <small>可选</small></span><input value={watermark} maxLength={24} placeholder="例如：内部资料" onChange={(event) => setWatermark(event.target.value)} /></label>
      </div>
      {error && <div className="error-message" role="alert">{error}</div>}
      <button className="export-button" type="button" disabled={busy} onClick={() => void exportPdf()}>
        {busy ? "正在生成 PDF…" : "合并并下载 PDF"}
      </button>
      <button className="clear-button" type="button" disabled={busy} onClick={() => setItems([])}>清空全部文件</button>
      <input ref={inputRef} className="visually-hidden" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*" onChange={(event) => { if (event.target.files) void addFiles(event.target.files); event.target.value = ""; }} />
    </div>
  );
}
