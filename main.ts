import { Editor, MarkdownView, Notice, Plugin, TFile, arrayBufferToBase64, Vault } from 'obsidian';
import * as fs from 'fs/promises';
const { dialog } = require('@electron/remote');
export default class CopyImageTextPlugin extends Plugin {
  async onload() {
    this.addCommand({
      id: 'copy-text',
      name: '复制文本和图片(富文本)',
      editorCallback: (editor: Editor, view: MarkdownView) => this.copyTextAndImages(editor, view)
    });


    this.addCommand({
      id: 'copy-markdown',
      name: '复制为Markdown格式',
      editorCallback: (editor: Editor, view: MarkdownView) => this.copyAsMarkdown(editor, view)
    });

    this.addCommand({
      id: 'export-html',
      name: '导出为HTML文件',
      editorCallback: (editor: Editor, view: MarkdownView) => this.exportAsHtml(editor, view)
    });
  }

  async copyTextAndImages(editor: Editor, view: MarkdownView) {
    try {
      let content = editor.getSelection() || editor.getValue();

      if (!view.file) {
        new Notice('无法获取当前文件信息，复制可能不完整');
        return;
      }

      const htmlContent = await this.convertToHtml(content, view.file);
      
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([htmlContent], { type: 'text/html' }),
          'text/plain': new Blob([content], { type: 'text/plain' })
        })
      ]);
      
      new Notice('内容已成功复制');
    } catch (error) {
      new Notice('复制失败，请稍后重试');
    }
  }

  private lastExportedHtmlPath: string | null = null;

  async exportAsHtml(editor: Editor, view: MarkdownView) {
    try {
      let content = editor.getSelection() || editor.getValue();

      if (!view.file) {
        new Notice('无法获取当前文件信息，导出可能不完整');
        return;
      }

      const htmlContent = await this.convertToHtml(content, view.file);
      const fileName = view.file.basename + '.html';

      const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        title: '选择HTML导出目录',
        defaultPath: view.file.parent?.path || ''
      });

      if (result.canceled || result.filePaths.length === 0) {
        new Notice('已取消导出。');
        return;
      }

      let exportFolderPath = result.filePaths[0];

      if (exportFolderPath && !exportFolderPath.endsWith('/') && exportFolderPath !== '/') {
        exportFolderPath += '/';
      }

      const filePath = `${exportFolderPath}${fileName}`;

      const vaultRootPath = this.app.vault.getRoot().path;
      
      const normalizedExportPath = exportFolderPath.endsWith('/') ? exportFolderPath.slice(0, -1) : exportFolderPath;
      const normalizedVaultRootPath = vaultRootPath.endsWith('/') ? vaultRootPath.slice(0, -1) : vaultRootPath;


      const nodeFsPath = exportFolderPath.replace(/\//g, '\\') + fileName;
      await fs.mkdir(exportFolderPath, { recursive: true }); // 确保目录存在
      await fs.writeFile(nodeFsPath, htmlContent);
      new Notice(`文件已成功导出到: ${nodeFsPath}`);
      
      this.lastExportedHtmlPath = filePath;


    } catch (error) {
      new Notice('导出HTML失败，请稍后重试');
    }
  }


  async copyAsMarkdown(editor: Editor, view: MarkdownView) {
    try {
      let content = editor.getSelection() || editor.getValue();

      if (!view.file) {
        new Notice('无法获取当前文件信息复制可能不完整');
        return;
      }

      content = await this.replaceImageLinks(content, view.file);

      await navigator.clipboard.writeText(content);
      new Notice('Markdown格式已复制');
    } catch (error) {
      new Notice('复制失败，请稍后重试');
    }
  }

  async replaceImageLinks(content: string, file: TFile): Promise<string> {
    const imageRegex = /!\[\[(.*?)\]\]/g;
    let result = content;
    
    for (const match of content.matchAll(imageRegex)) {
      const imagePath = match[1];
      const imageFile = this.app.vault.getFiles().find(f => 
        f.name.toLowerCase().includes(imagePath.split('/').pop()?.toLowerCase() || '')
      );

      if (imageFile) {
        let absolutePath = this.app.vault.getResourcePath(imageFile)
          .replace(/^app:\/\/.*?\//, '')
          .replace(/\?.*$/, '')
          .replace(/\\/g, '/');
        
        absolutePath = decodeURI(absolutePath);
        
        const fileUrl = 'file:///' + absolutePath;
                
        result = result.replace(
          `![[${imagePath}]]`, 
          `![${imagePath}](${fileUrl})`
        );
      }
    }
    
    return result;
  }

  async convertToHtml(content: string, file: TFile): Promise<string> {
    const imageRegex = /!\[\[(.*?)\]\]/g;
    const externalImageRegex = /!\[.*?\]\((file:\/\/\/.+?)\)/g;

    const internalImageReplacements = await Promise.all(Array.from(content.matchAll(imageRegex)).map(
      match => this.replaceImageWithBase64(match[1], file)
    ));
    
    let htmlContent = content;
    internalImageReplacements.forEach(({ original, replacement }) => {
      htmlContent = htmlContent.replace(original, replacement);
    });

    const externalImageReplacements = await Promise.all(Array.from(htmlContent.matchAll(externalImageRegex)).map(
      match => this.replaceExternalImageWithBase64(match[1]) as Promise<{ original: string, replacement: string }>
    ));

    externalImageReplacements.forEach(( { original, replacement }: { original: string, replacement: string } ) => {
      htmlContent = htmlContent.replace(original, replacement);
    });

    const codeBlockPlaceholders = new Map<string, string>();
    let placeholderIndex = 0;

    // 1. 用占位符替换代码块
    htmlContent = htmlContent.replace(/```(?:\w+)?\n([\s\S]*?)```/g, (match, code) => {
      const placeholder = `___CODE_BLOCK_PLACEHOLDER_${placeholderIndex}___`;
      const escapedCode = this.escapeHtml(code.trim());
      codeBlockPlaceholders.set(placeholder, `<pre style="background-color: #f6f8fa; border-radius: 3px; padding: 16px; overflow: auto;"><code style="font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace; font-size: 14px; line-height: 1.5;">${escapedCode}</code></pre>`);
      placeholderIndex++;
      return placeholder;
    });

    htmlContent = htmlContent.replace(/^---$/gm, '<hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;">');

    htmlContent = htmlContent.replace(/^(#+)\s+(.*?)$/gm, (match, hashes, title) => {
      const level = hashes.length;
      const fontSize = 28 - (level * 2);
      return `<h${level} style="font-size: ${fontSize}px; font-weight: bold; margin: 10px 0;">${title}</h${level}>`;
    });

    htmlContent = htmlContent
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="background-color: #f0f0f0; padding: 2px 4px; border-radius: 3px;">$1</code>');
    
    htmlContent = htmlContent.replace(/==([^=\n]+?)==/g, (match, p1) => {
      const replaced = `<span style="background-color: yellow;">${p1}</span>`;
      return replaced;
    });

    htmlContent = htmlContent
      .replace(/(?<!\!)\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color: #576b95; text-decoration: none;">$1</a>');

    // 2. 将占位符替换回原始代码块
    codeBlockPlaceholders.forEach((value, key) => {
      htmlContent = htmlContent.replace(key, value);
    });

    return `<div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; color: #333; line-height: 1.6;">${htmlContent}</div>`;
  }

  async replaceImageWithBase64(imagePath: string, file: TFile): Promise<{ original: string, replacement: string }> {
    try {
      const fileName = imagePath.split('/').pop() || imagePath;
      const imageFile = this.app.vault.getFiles().find(f =>
        f.name.toLowerCase().includes(fileName.toLowerCase())
      );

      if (!imageFile) {
        return { original: `![[${imagePath}]]`, replacement: `[图片未找到: ${imagePath}]` };
      }

      const stat = await this.app.vault.adapter.stat(imageFile.path);
      if (stat && stat.size > 10 * 1024 * 1024) {
        return { original: `![[${imagePath}]]`, replacement: `[图片文件过大: ${imagePath}]` };
      }

      const imageArrayBuffer = await this.app.vault.readBinary(imageFile);
      const base64 = arrayBufferToBase64(imageArrayBuffer);
      const mimeType = this.getMimeType(imagePath);

      return {
        original: `![[${imagePath}]]`,
        replacement: `<img src="data:${mimeType};base64,${base64}" alt="${imagePath}" style="max-width: 100%;">`
      };
    } catch (error) {
      return { original: `![[${imagePath}]]`, replacement: `[图片处理错误: ${imagePath}]` };
    }
  }

  async replaceExternalImageWithBase64(imagePath: string): Promise<{ original: string, replacement: string }> {
    try {
      let filePath = imagePath.replace(/^file:\/\/\//, '');

      if (process.platform === 'win32') {
        filePath = filePath.replace(/\//g, '\\');
      }

      const imageBuffer = await fs.readFile(filePath);
      const base64 = imageBuffer.toString('base64');
      const mimeType = this.getMimeType(filePath);

      return {
        original: `![](${imagePath})`,
        replacement: `<img src="data:${mimeType};base64,${base64}" alt="${imagePath}" style="max-width: 100%;">`
      };
    } catch (error) {
      return { original: `![](${imagePath})`, replacement: `[外部图片处理错误: ${imagePath}]` };
    }
  }

  getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'svg':
        return 'image/svg+xml';
      default:
        return 'image/png';
    }
  }

  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/#/g, "&#35;"); // 转义 # 符号，防止在代码块中被误识别为标题
  }
}
