import { CodeProps } from "react-markdown/lib/ast-to-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark, materialLight } from "react-syntax-highlighter/dist/esm/styles/prism";

const isDarkMode = () => {
	if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
		return true;
	} else {
		return false;
	}
};

const CodeBlock = (props: CodeProps) => {
	const { children, className, inline } = props;
	const match = /language-(\w+)/.exec(className || "");
	const language = match ? match[1] : "javascript";
	const modClass = `${className} cdx-text-sm`;
	return !inline ? (
		<SyntaxHighlighter
			className={modClass}
			language={language}
			PreTag="div"
			style={isDarkMode() ? atomDark : materialLight}
			showLineNumbers
		>
			{String(children)}
		</SyntaxHighlighter>
	) : (
		<code
			className={`${modClass} cdx-bg-gray-200 dark:cdx-bg-gray-700 cdx-outline-gray-200 dark:cdx-outline-gray-700 cdx-rounded cdx-outline cdx-break-words`}
			{...props}
		>
			{children}
		</code>
	);
};

export default CodeBlock;
