import { parseMarkdown, type MdToken } from '@/lib/markdown'
import { codeClass, linkClass } from './styles'

function render(tokens: MdToken[]) {
  return tokens.map((tk, i) => {
    if (tk.type === 'text') return <span key={i}>{tk.text}</span>
    if (tk.type === 'code') return <code key={i} className={codeClass}>{tk.text}</code>
    if (tk.type === 'strong') return <strong key={i}>{render(tk.children)}</strong>
    return (
      <a key={i} href={tk.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {render(tk.children)}
      </a>
    )
  })
}

/** Cell text with **bold**, `code` and links. Built from tokens, never from raw HTML. */
export function Markdown({ text }: { text: string }) {
  return <>{render(parseMarkdown(text))}</>
}
