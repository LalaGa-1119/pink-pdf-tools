# 粉纸 PDF 工具箱

一个免费、无需登录的浏览器 PDF 小工具。文件仅在用户设备上处理，不会上传到服务器。

## 功能

- 合并多个 PDF
- 将 JPG、PNG、WebP 图片转为 PDF
- 混合排列 PDF 与图片
- 拖拽或按钮调整文件顺序
- 自定义导出文件名
- 添加中英文文字水印
- 电脑与手机端自适应

## 本地启动

```bash
npm install
npm run dev
```

## 验证

```bash
npm test
```

## 技术与开源说明

项目使用 React、TypeScript 与 [pdf-lib](https://github.com/Hopding/pdf-lib)，受开源浏览器 PDF 工具的本地处理思路启发。本项目自身采用 MIT License。

## 隐私

所有 PDF 与图片均在浏览器内完成解析、合并和导出，不会上传至第三方服务。
