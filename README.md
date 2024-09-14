# Copy Image Text

Copy Image Text 是一个 Obsidian 插件,允许用户复制笔记内容(包括文本和图片)到剪贴板,并保持格式。

## 功能

- 复制选中的文本或整个文档内容
- 自动将 Obsidian 中的图片转换为内嵌的 base64 格式
- 保持 Markdown 格式,包括标题、粗体、斜体、代码块等
- 支持复制到富文本编辑器(如 Word)和 Markdown 编辑器
- 特别优化了在微信公众号编辑器中的显示效果

## 安装

1. 打开 Obsidian 设置
2. 进入 "第三方插件" 设置页面
3. 确保 "安全模式" 已关闭
4. 点击 "浏览社区插件"
5. 搜索 "Copy Image Text"
6. 点击 "安装"
7. 安装完成后,启用插件

## 使用方法

1. 在 Obsidian 中打开一个笔记
2. 选择要复制的文本(如果不选择,将复制整个文档)
3. 使用快捷键 `Ctrl+Shift+C` (Windows/Linux) 或 `Cmd+Shift+C` (Mac) 复制内容
4. 在目标应用程序中粘贴内容

## 开发说明

本插件的 `main.js` 文件已包含在版本控制中。这意味着:

1. 克隆仓库后,可以直接使用,无需额外的构建步骤。
2. 在修改 TypeScript 源代码后,请确保运行 `npm run build` 来更新 `main.js`。
3. 提交更改时,请包含更新后的 `main.js` 文件。

## 注意事项

- 图片大小限制为 10MB,超过此大小的图片将不会被复制
- 某些特殊格式可能在某些目标应用中无法完全保留
- 请确保您有权复制和分享笔记中包含的图片

## 反馈与支持

如果您遇到任何问题或有改进建议,请在 GitHub 仓库中提出 issue。

## 许可证

本插件采用 MIT 许可证。详情请见 [LICENSE](LICENSE) 文件。

## 作者

由 msgk 开发和维护。
