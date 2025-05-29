import { App, Editor, MarkdownView, Notice, Plugin, TFile, arrayBufferToBase64, Vault, Modal, Setting } from 'obsidian';
import * as fs from 'fs/promises';
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

  // 用于存储最近一次导出的HTML文件路径
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
      
      // 尝试使用 Obsidian 的文件选择器来选择导出目录
      // 注意：Obsidian 核心 API 没有直接的 showDirectoryPicker。
      // 我们需要模拟一个简单的目录选择器，或者让用户输入路径。
      // 考虑到用户要求“弹出一个框，可以选择其他路径”，我们将创建一个简单的模态框让用户输入路径。
      // 更好的方式是使用 Obsidian 的文件管理器 API，但目前没有直接暴露给插件的目录选择器。

      // 弹出模态框让用户选择或输入导出路径
      const exportPath = await new Promise<string | null>((resolve) => {
        new ExportPathModal(this.app, view.file?.parent?.path || '', resolve).open();
      });

      if (!exportPath) {
        new Notice('已取消导出。');
        return;
      }

      // 确保路径以 '/' 结尾，如果不是根目录
      let finalExportPath = exportPath;
      if (finalExportPath && !finalExportPath.endsWith('/') && finalExportPath !== '/') {
        finalExportPath += '/';
      }

      const filePath = `${finalExportPath}${fileName}`;

      // 确保目录存在
      const folderPath = filePath.substring(0, filePath.lastIndexOf('/'));
      if (!(await this.app.vault.adapter.exists(folderPath))) {
        await this.app.vault.createFolder(folderPath);
      }

      // 使用 Obsidian 的 vault.adapter.write 方法来写入文件
      await this.app.vault.adapter.write(filePath, htmlContent);
      
      this.lastExportedHtmlPath = filePath; // 存储路径

      new Notice(`文件已成功导出到: ${filePath}`);
      // 提示用户文件已导出，并建议手动打开
      new Notice('请手动打开导出的HTML文件。');

    } catch (error) {
      console.error('导出HTML失败:', error);
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
    const imageRegex = /!\[\[(.*?)\]\]/g; // Obsidian 内部链接
    const externalImageRegex = /!\[.*?\]\((file:\/\/\/.+?)\)/g; // 外部图片链接，例如 ![](file:///...)

    // 处理 Obsidian 内部链接图片
    const internalImageReplacements = await Promise.all(Array.from(content.matchAll(imageRegex)).map(
      match => this.replaceImageWithBase64(match[1], file)
    ));
    
    let htmlContent = content;
    internalImageReplacements.forEach(({ original, replacement }) => {
      htmlContent = htmlContent.replace(original, replacement);
    });

    // 处理外部图片链接
    const externalImageReplacements = await Promise.all(Array.from(htmlContent.matchAll(externalImageRegex)).map(
      match => this.replaceExternalImageWithBase64(match[1]) as Promise<{ original: string, replacement: string }>
    ));

    externalImageReplacements.forEach(( { original, replacement }: { original: string, replacement: string } ) => {
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
      .replace(/`(.+?)`/g, '<code style="background-color: #f0f0f0; padding: 2px 4px; border-radius: 3px;">$1</code>');
    
    htmlContent = htmlContent.replace(/==([^=\n]+?)==/g, (match, p1) => {
      const truncatedMatch = match.length > 100 ? match.substring(0, 50) + '...' + match.substring(match.length - 50) : match;
      const truncatedP1 = p1.length > 100 ? p1.substring(0, 50) + '...' + p1.substring(p1.length - 50) : p1;
      console.log('Original highlight match:', truncatedMatch, 'Length:', match.length);
      console.log('Captured content (p1):', truncatedP1, 'Length:', p1.length);
      const replaced = `<span style="background-color: yellow;">${p1}</span>`;
      console.log('Replaced HTML (truncated):', replaced.length > 100 ? replaced.substring(0, 50) + '...' + replaced.substring(replaced.length - 50) : replaced);
      return replaced;
    }); // 处理高亮

    htmlContent = htmlContent
      .replace(/(?<!\!)\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color: #576b95; text-decoration: none;">$1</a>');

    return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; color: #333; line-height: 1.6; text-align: center;">${htmlContent}</div>`;
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
      // 移除 'file:///' 前缀以获取实际文件路径
      let filePath = imagePath.replace(/^file:\/\/\//, '');

      // 处理 Windows 路径，将 / 替换为 \
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
      console.error(`处理外部图片失败: ${imagePath}`, error);
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
      .replace(/'/g, "&#039;");
  }
}

// 简单的导出路径模态框
class ExportPathModal extends Modal {
  result: string;
  onSubmit: (result: string | null) => void;
  initialPath: string;

  constructor(app: App, initialPath: string, onSubmit: (result: string | null) => void) {
    super(app);
    this.initialPath = initialPath;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const {contentEl} = this;
    contentEl.createEl('h2', { text: '选择HTML导出路径' });

    new Setting(contentEl)
      .setName('导出路径')
      .setDesc('输入或修改HTML文件的导出目录。')
      .addText((text) =>
        text
          .setPlaceholder('例如：导出/HTML')
          .setValue(this.initialPath)
          .onChange((value) => {
            this.result = value;
          })
      );

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText('导出')
          .setCta()
          .onClick(() => {
            this.close();
            this.onSubmit(this.result || this.initialPath); // 如果用户没有输入，使用初始路径
          })
      )
      .addButton((btn) =>
        btn
          .setButtonText('取消')
          .onClick(() => {
            this.close();
            this.onSubmit(null);
          })
      );
  }

  onClose() {
    const {contentEl} = this;
    contentEl.empty();
  }
}