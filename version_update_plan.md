# 版本更新计划

## 当前版本信息

*   `package.json` 中的版本是 `1.0.7`。
*   `manifest.json` 中的版本是 `1.0.7`。
*   `versions.json` 中记录了 `1.0.5`, `1.0.6`, `1.0.7` 三个版本。

## 版本更新机制

项目使用 `npm version` 命令来管理版本。在 `package.json` 的 `scripts` 中定义了一个 `version` 脚本：
`"version": "node version-bump.mjs %npm_package_version% && git add manifest.json versions.json"`

这意味着当您运行 `npm version <新版本号>` 命令时，npm 会自动执行以下操作：
1.  更新 `package.json` 中的 `version` 字段为 `<新版本号>`。
2.  执行 `version-bump.mjs` 脚本，该脚本会读取 `manifest.json` 和 `versions.json`，并将它们内部的版本号更新为 `<新版本号>`。
3.  将 `manifest.json` 和 `versions.json` 的更改添加到 Git 暂存区。
4.  自动创建一个 Git commit，提交版本更新。
5.  自动创建一个 Git tag，标记这个版本。

## 更新计划

为了将项目版本更新为 `1.1.0`，您只需要执行一个命令：

```bash
npm version 1.1.0
```

## 流程图

```mermaid
graph TD
    A[用户执行 npm version 1.1.0] --> B{npm 自动更新 package.json};
    B --> C[npm 执行 scripts.version 脚本];
    C --> D[node version-bump.mjs 1.1.0];
    D --> E{version-bump.mjs 更新 manifest.json};
    D --> F{version-bump.mjs 更新 versions.json};
    E & F --> G[git add manifest.json versions.json];
    G --> H[npm 自动创建 Git commit];
    H --> I[npm 自动创建 Git tag];
    I --> J[版本更新完成];