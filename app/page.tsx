import PdfTool from "./PdfTool";
import type { Metadata } from "next";
import { headers } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og.png`;
  const title = "粉纸 PDF 工具箱";
  const description = "合并 PDF 与图片，文件不上传。";
  return {
    title,
    description,
    openGraph: { title, description, images: [image], type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="粉纸 PDF 工具箱首页">
          <span className="brand-mark" aria-hidden="true">粉</span>
          <span>粉纸 PDF</span>
        </a>
        <span className="privacy-note">🔒 文件不上传</span>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow">免费 · 本地处理 · 无需登录</div>
        <h1>把散落的文件，<br />整齐地合成一份 PDF。</h1>
        <p>拖入 PDF 或图片，调整顺序后即可导出。所有处理都在你的浏览器中完成。</p>
      </section>

      <section className="workspace" aria-label="PDF 合并工作台">
        <PdfTool />
        <aside className="steps" aria-label="使用步骤">
          <h3>三步完成</h3>
          <ol>
            <li><span>1</span><div><b>添加文件</b><small>拖拽或点击选择</small></div></li>
            <li><span>2</span><div><b>调整顺序</b><small>按你需要的顺序排列</small></div></li>
            <li><span>3</span><div><b>下载 PDF</b><small>合并后立即保存</small></div></li>
          </ol>
        </aside>
      </section>

      <section className="trust-row" aria-label="产品特点">
        <div><span>◎</span><b>隐私安全</b><small>文件不离开设备</small></div>
        <div><span>⚡</span><b>打开即用</b><small>无需注册或安装</small></div>
        <div><span>∞</span><b>完全免费</b><small>不限次数无水印</small></div>
      </section>
    </main>
  );
}
