# 复制图文 (Copy Image Text)

Copy Image Text is an Obsidian plugin that allows users to copy note content (including text and images) to the clipboard while maintaining formatting.

## Features

- Supports two copy modes:
  - Copy text and images (rich text format): Suitable for Word, WeChat public account editor, etc.
  - Copy as Markdown format: Suitable for other Markdown editors
- Automatically convert Obsidian images to inline base64 format (rich text mode) or standard Markdown image links (Markdown mode)
- **New:** Supports exporting note content to HTML files for easy viewing or sharing in browsers.
- Maintain Markdown formatting, including headers, bold, italic, code blocks, etc.
- Specially optimized for display in WeChat public account editor

## Usage

1. Open a note in Obsidian
2. Select the text you want to copy (if no selection, the entire document will be copied)
3. Use the command palette to execute one of the following commands:
   - "Copy text and images (rich text)": Copy as rich text format
   - "Copy as Markdown format": Copy as standard Markdown format
4. Paste the content in the target application

Tip: You can set hotkeys for these two commands in Obsidian Settings under "Hotkeys" for more convenient use.

## Installation

1. Open Obsidian Settings
2. Go to "Third-party plugins" settings page
3. Make sure "Safe mode" is turned off
4. Click "Browse community plugins"
5. Search for "Copy Image Text"
6. Click "Install"
7. After installation, enable the plugin

## Development Notes

This plugin is developed using TypeScript. If you want to contribute:

1. After cloning the repository, run `npm install` to install dependencies.
2. After modifying the TypeScript source code, run `npm run build` to compile.
3. The compiled `main.js` file is not included in version control but needs to be manually included in releases.

Note: When publishing a new version, make sure to run `npm run build` first, then add the generated `main.js` file to the release package.

## Notes

- Image size is limited to 10MB, images exceeding this size will not be copied
- Some special formatting may not be fully preserved in certain target applications
- Please ensure you have the right to copy and share the images contained in your notes
- Tips for using Markdown format copy:
  - If you want to publish your document to GitHub or blog platforms, follow these steps:
    1. Use an editor that supports image bed upload (e.g., Typora + PicList)
    2. Upload the images in your document to an image bed (tested in Typora)
    3. This will convert your images to online links
    4. Then you can simply copy the entire document, as all images are now online links
  - Obsidian might have similar image bed upload plugins available (untested)

## Feedback and Support

If you encounter any issues or have suggestions for improvement, please raise an issue in the GitHub repository.

## License

This plugin is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Author

Developed and maintained by msgk.

## Version

Current version: 1.1.8
