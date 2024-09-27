# 复制图文 (Copy Image Text)

Copy Image Text is an Obsidian plugin that allows users to copy note content (including text and images) to the clipboard while maintaining formatting.

## Features

- Copy selected text or entire document content
- Automatically convert Obsidian images to inline base64 format
- Maintain Markdown formatting, including headers, bold, italic, code blocks, etc.
- Support copying to rich text editors (such as Word) and Markdown editors
- Specially optimized for display in WeChat public account editor

## Installation

1. Open Obsidian Settings
2. Go to "Third-party plugins" settings page
3. Make sure "Safe mode" is turned off
4. Click "Browse community plugins"
5. Search for "Copy Image Text"
6. Click "Install"
7. After installation, enable the plugin

## Usage

1. Open a note in Obsidian
2. Select the text you want to copy (if no selection, the entire document will be copied)
3. Use the command palette to execute the "Copy text and images" command
4. Paste the content in the target application

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

## Feedback and Support

If you encounter any issues or have suggestions for improvement, please raise an issue in the GitHub repository.

## License

This plugin is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Author

Developed and maintained by msgk.

## Version

Current version: 1.0.5
