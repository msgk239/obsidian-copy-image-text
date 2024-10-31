import { Editor, MarkdownView, Notice, Plugin, TFile, arrayBufferToBase64 } from 'obsidian';

export default class CopyImageTextPlugin extends Plugin {
  async onload() {
    this.addCommand({
      id: 'copy-text',
      name: '复制文本和图片',
      editorCallback: (editor: Editor, view: MarkdownView) => this.copyTextAndImages(editor, view)
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

  async convertToHtml(content: string, file: TFile): Promise<string> {
    const imageRegex = /!\[\[(.*?)\]\]/g;
    const replacements = await Promise.all(Array.from(content.matchAll(imageRegex)).map(
      match => this.replaceImageWithBase64(match[1], file)
    ));
    
    let htmlContent = content;
    replacements.forEach(({ original, replacement }) => {
      htmlContent = htmlContent.replace(original, replacement);
    });

    // 处理分割线
    htmlContent = htmlContent.replace(/^---$/gm, '<hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;">');

    // 处理代码块
    htmlContent = htmlContent.replace(/```([\s\S]*?)```/g, (match, code) => {
      const escapedCode = this.escapeHtml(code.trim());
      return `<pre style="background-color: #f6f8fa; border-radius: 3px; padding: 16px; overflow: auto;"><code style="font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace; font-size: 14px; line-height: 1.5;">${escapedCode}</code></pre>`;
    });

    // 处理标题
    htmlContent = htmlContent.replace(/^(#+)\s+(.*?)$/gm, (match, hashes, title) => {
      const level = hashes.length;
      const fontSize = 28 - (level * 2);
      return `<h${level} style="font-size: ${fontSize}px; font-weight: bold; margin: 10px 0;">${title}</h${level}>`;
    });

    // 其他 Markdown 到 HTML 的转换
    htmlContent = htmlContent
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="background-color: #f0f0f0; padding: 2px 4px; border-radius: 3px;">$1</code>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color: #576b95; text-decoration: none;">$1</a>');

    return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; color: #333; line-height: 1.6;">${htmlContent}</div>`;
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
      .replace(/'/g, "&#039;");
  }
}