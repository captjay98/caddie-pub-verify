import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Chat markdown in Halo Ops styling — every element mapped to tokens,
// so model output (headings, lists, tables, code) renders like the product, not like GitHub.
export function Markdown({ text }: { text: string }) {
  return (
    <div className="md-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
