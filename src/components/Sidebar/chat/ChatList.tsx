import { ReactMarkdown } from 'react-markdown/lib/react-markdown'
import CodeBlock from './markdown-components/CodeBlock'
import remarkGfm from 'remark-gfm'
import { useEffect, useRef } from 'react'
import { Table } from './markdown-components/Table'
import remarkBreaks from 'remark-breaks'
import rehypeRaw from 'rehype-raw'
import { ChatMessage, ChatRole } from '../../../hooks/useCurrentChat'
import FilePreviewBar from './FilePreviewBar'
import { RiCloseLine } from 'react-icons/ri'

interface ChatListProps {
  messages: ChatMessage[]
  removeMessagePair: (timestamp: number) => void
}

const ChatList = ({ messages, removeMessagePair }: ChatListProps) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [])

  const filteredMsgs = messages.filter((msg) => msg.role !== ChatRole.SYSTEM)

  return (
    <div
      ref={containerRef}
      className="cdx-h-[calc(100vh-200px)] cdx-text-sm cdx-overflow-y-auto cdx-pb-12 cdx-break-words"
    >
      {filteredMsgs.length < 1 ? (
        <div className="cdx-mt-10 cdx-text-center">
          <img
            alt="robot"
            src="/images/robot.png"
            className="cdx-mx-auto"
            height={300}
            width={300}
          />
          <h1 className="cdx-text-xl cdx-text-gray-500 dark:cdx-text-gray-400">
            Start a new conversation 🎉
          </h1>
          <p className="cdx-text-gray-500 dark:cdx-text-gray-400 cdx-mt-1 cdx-leading-tight cdx-font-light">
            Type your message at the bottom <br /> and press send button
          </p>
        </div>
      ) : (
        filteredMsgs
          .filter((msg) => msg.role !== ChatRole.SYSTEM)
          .map((msg, i) => (
            <div
              data-user={msg.role === ChatRole.USER ? 'true' : undefined}
              className="markdown cdx-group cdx-relative cdx-px-4 cdx-py-2 data-[user]:cdx-border-l-2 cdx-border-blue-400 data-[user]:cdx-bg-black/5 data-[user]:dark:cdx-bg-neutral-900/50 cdx-max-w-[400px]"
              key={`${msg.timestamp}-${i}`}
            >
              {msg.role === ChatRole.USER && (
                <button
                  type="button"
                  onClick={() => removeMessagePair(msg.timestamp)}
                  className="cdx-absolute group-hover:cdx-visible cdx-invisible cdx-right-2 cdx-top-2 cdx-p-0.5 cdx-bg-black/20 cdx-rounded"
                >
                  <RiCloseLine />
                </button>
              )}
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  code: CodeBlock,
                  table: Table,
                }}
              >
                {msg.content.replace(/(?<=\n\n)(?![*-])\n/gi, '&nbsp;\n ')}
              </ReactMarkdown>
              {msg.files && <FilePreviewBar files={msg.files} />}
            </div>
          ))
      )}
    </div>
  )
}

export default ChatList
