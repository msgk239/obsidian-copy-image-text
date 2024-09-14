import { Editor, MarkdownView, Notice, Plugin, TFile, TAbstractFile } from 'obsidian';

export default class CopyImageTextPlugin extends Plugin {
  async onload() {
    this.addCommand({
      id: 'copy-text',
      name: '复制文本和图片',
      editorCallback: (editor: Editor, view: MarkdownView) => this.copyTextAndImages(editor, view),
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "c" }]
    });
  }

  async copyTextAndImages(editor: Editor, view: MarkdownView) {
    try {
      console.log('开始复制文本和图片');
      let content = editor.getSelection();
      
      if (!content) {
        content = editor.getValue();
        console.log('没有选中文本,复制整个文档');
      } else {
        console.log('复制选中的文本');
      }

      if (!view.file) {
        console.warn('无法获取当前文件信息');
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
      
      console.log('成功复制到剪贴板');
      new Notice('内容已成功复制');
    } catch (error) {
      console.error('复制过程中发生错误:', error);
      new Notice('复制失败,请查看控制台以获取更多信息');
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
      const fontSize = 28 - (level * 2); // 一级标题28px，逐级递减
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
      console.log(`尝试处理图片: ${imagePath}`);
      
      // 获取文件名部分
      const fileName = imagePath.split('/').pop() || imagePath;
      console.log(`图片文件名: ${fileName}`);
      
      // 搜索整个 vault 中的图片文件,使用部分文件名匹配
      const imageFile = this.app.vault.getFiles().find(f => 
        f.name.toLowerCase().includes(fileName.toLowerCase())
      );

      if (!imageFile) {
        console.warn(`图片未找到: ${imagePath}`);
        return { original: `![[${imagePath}]]`, replacement: `[图片未找到: ${imagePath}]` };
      }

      console.log(`找到图片文件: ${imageFile.path}`);

      // 检查文件大小
      const stat = await this.app.vault.adapter.stat(imageFile.path);
      if (stat) {
        const fileSize = stat.size;
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (fileSize > maxSize) {
          console.warn(`图片文件过大: ${fileSize} 字节，超过 ${maxSize} 字节限制`);
          return { original: `![[${imagePath}]]`, replacement: `[图片文件过大: ${imagePath}]` };
        }
      }

      const imageArrayBuffer = await this.app.vault.readBinary(imageFile);
      console.log(`成功读取图片数据,大小: ${imageArrayBuffer.byteLength} 字节`);

      let base64;
      try {
        base64 = await this.arrayBufferToBase64(imageArrayBuffer);
        console.log(`成功转换为Base64,长度: ${base64.length}`);
      } catch (error) {
        console.error(`Base64转换失败:`, error);
        return { original: `![[${imagePath}]]`, replacement: `[图片Base64转换失败: ${imagePath}]` };
      }

      const mimeType = this.getMimeType(imagePath);
      console.log(`成功处理图片: ${imagePath}, MIME类型: ${mimeType}`);

      return {
        original: `![[${imagePath}]]`,
        replacement: `<img src="data:${mimeType};base64,${base64}" alt="${imagePath}" style="max-width: 100%;">`
      };
    } catch (error) {
      console.error(`处理图片时出错 (${imagePath}):`, error);
      console.error('错误堆栈:', error.stack);
      return { original: `![[${imagePath}]]`, replacement: `[图片处理错误: ${imagePath}]` };
    }
  }

  arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const blob = new Blob([buffer]);
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result?.toString().split(',')[1];
        resolve(base64 || '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    console.log(`文件扩展名: ${ext}`);
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
        console.warn(`未知的文件扩展名: ${ext},使用默认MIME类型`);
        return 'image/png';  // 默认使用 PNG 类型
    }
  }

  // 添加这个辅助方法来转义 HTML 特殊字符
  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}