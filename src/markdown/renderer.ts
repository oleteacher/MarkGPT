import { marked } from "marked";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import "katex/dist/katex.min.css";
import renderMathInElement from "katex/contrib/auto-render";
import { markdownPreview } from "../components/uiElements";

// Configure marked with syntax highlighting
marked.use({
  extensions: [
    {
      name: "highlight",
      level: "block",
      start: (src: string) => src.match(/^```/)?.index,
      tokenizer(src: string) {
        const rule = /^```(\w+)?\n([\s\S]*?)\n```/;
        const match = rule.exec(src);
        if (match) {
          return {
            type: "highlight",
            raw: match[0],
            lang: match[1],
            text: match[2],
          };
        }
      },
      renderer(token: any) {
        const validLang =
          token.lang && hljs.getLanguage(token.lang) ? token.lang : "plaintext";
        const highlighted = hljs.highlight(token.text, {
          language: validLang,
        }).value;
        return `<pre><code class="hljs language-${validLang}">${highlighted}</code></pre>`;
      },
    },
  ],
});

export function renderMathFormulas(): void {
  if (markdownPreview) {
    renderMathInElement(markdownPreview, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
      ],
      throwOnError: false,
      ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
      ignoredClasses: ["no-math"],
    });
  }
}
