# Markdown代码块转换为微信公众号代码块HTML结构计划

## 任务目标：
将Markdown代码块转换为微信公众号代码块的HTML结构，不涉及CSS样式。

## 详细计划：

### 步骤1：修改 `convertToHtml` 方法中的代码块处理逻辑
*   **识别代码块语言**：从Markdown代码块的开头（例如 ````javascript` 中的 `javascript`）提取语言类型。如果未指定语言，可以默认使用 `js` 或其他通用名称。
*   **构建外层 `<section>` 标签**：
    *   添加 `class="code-snippet__fix code-snippet__<lang>"`，其中 `<lang>` 是识别到的语言。
*   **构建行号 `<ul>` 标签**：
    *   添加 `class="code-snippet__line-index code-snippet__<lang>"`。
    *   根据代码块的行数，生成相应数量的 `<li>` 标签。每个 `<li>` 标签内部为空，用于显示行号。
*   **构建代码内容 `<pre><code>` 标签**：
    *   添加 `class="code-snippet__<lang>"` 到 `<pre>` 标签。
    *   **处理代码行**：
        *   遍历代码块的每一行。
        *   为每一行代码包裹一个 `<span>` 标签，并添加 `leaf=""` 属性。
        *   **实现简化的语法高亮**：
            *   识别代码行中的字符串（例如用双引号或单引号包裹的内容）。
            *   为识别到的字符串包裹一个 `<span>` 标签，并添加 `class="code-snippet__string"`。
            *   处理空格：微信公众号的代码块中，缩进的空格被替换为 `&nbsp;`。我需要确保这一点。
            *   处理其他特殊字符：确保 `escapeHtml` 函数能够正确处理HTML实体。
*   **替换现有代码块处理逻辑**：将 `main.ts` 中 [`main.ts:177`](main.ts:177) 到 [`main.ts:184`](main.ts:184) 的代码替换为新的逻辑。

### 步骤2：辅助函数（如果需要）
*   **`getLanguageFromCodeBlock` 函数**：用于从Markdown代码块的开头提取语言。
*   **`highlightCodeLine` 函数**：用于处理单行代码的语法高亮，包括字符串识别和 `&nbsp;` 替换。

### 步骤3：测试和验证
*   在本地环境中，使用一个包含Markdown代码块的测试文件，运行修改后的插件，并检查生成的HTML输出是否符合预期。

## 流程示意图：

```mermaid
graph TD
    A[Markdown代码块输入] --> B{convertToHtml函数};
    B --> C{识别代码块内容和语言};
    C --> D[构建 <section class="code-snippet__fix code-snippet__lang">];
    D --> E[构建 <ul class="code-snippet__line-index code-snippet__lang">];
    E --> F{根据行数生成<li>};
    D --> G[构建 <pre class="code-snippet__lang"><code>];
    G --> H{遍历代码行};
    H --> I[为每行包裹<span leaf="">];
    I --> J{识别字符串并包裹<span class="code-snippet__string">};
    I --> K{替换空格为&nbsp;};
    K --> L[HTML转义];
    L --> M[将处理后的代码行添加到<code>];
    M --> N[完成HTML结构输出];