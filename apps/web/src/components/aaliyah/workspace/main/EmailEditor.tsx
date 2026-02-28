"use client"

import * as React from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import {
    Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
    Link as LinkIcon, Quote, RemoveFormatting, MoreHorizontal
} from "lucide-react"
import { cn } from "@/lib/utils"

type EmailEditorProps = {
    content: string
    onChange: (html: string) => void
    editable?: boolean
    placeholder?: string
}

export function EmailEditor({ content, onChange, editable = true, placeholder = "Write your message..." }: EmailEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Link.configure({
                openOnClick: false,
            }),
            Placeholder.configure({
                placeholder,
            }),
        ],
        content,
        editable,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
    })

    // Update content if it changes externally (e.g. AI update)
    // PREVENT CURSOR JUMP: Only update if not currently focused or if content is significantly different
    React.useEffect(() => {
        if (editor && !editor.isFocused && content !== editor.getHTML()) {
            editor.commands.setContent(content)
        }
    }, [content, editor])

    if (!editor) return null

    return (
        <div className={cn(
            "w-full transition-all duration-200",
            editable ? "bg-surface" : "bg-transparent"
        )}>
            {editable && (
                <div className="flex flex-wrap items-center gap-1 border-b border-borderSubtle pb-2 mb-3">
                    <ToolbarButton
                        active={editor.isActive("bold")}
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        icon={<Bold className="h-3.5 w-3.5" />}
                        label="Bold"
                    />
                    <ToolbarButton
                        active={editor.isActive("italic")}
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        icon={<Italic className="h-3.5 w-3.5" />}
                        label="Italic"
                    />
                    <ToolbarButton
                        active={editor.isActive("underline")}
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        icon={<UnderlineIcon className="h-3.5 w-3.5" />}
                        label="Underline"
                    />
                    <div className="w-px h-4 bg-borderSubtle mx-1" />
                    <ToolbarButton
                        active={editor.isActive("bulletList")}
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        icon={<List className="h-3.5 w-3.5" />}
                        label="Bullets"
                    />
                    <ToolbarButton
                        active={editor.isActive("orderedList")}
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        icon={<ListOrdered className="h-3.5 w-3.5" />}
                        label="Numbers"
                    />
                    <div className="w-px h-4 bg-borderSubtle mx-1" />
                    <ToolbarButton
                        active={editor.isActive("blockquote")}
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        icon={<Quote className="h-3.5 w-3.5" />}
                        label="Quote"
                    />
                    <ToolbarButton
                        onClick={() => {
                            const url = window.prompt("Enter URL")
                            if (url) editor.chain().focus().setLink({ href: url }).run()
                        }}
                        active={editor.isActive("link")}
                        icon={<LinkIcon className="h-3.5 w-3.5" />}
                        label="Link"
                    />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
                        icon={<RemoveFormatting className="h-3.5 w-3.5" />}
                        label="Clear"
                    />
                </div>
            )}

            <EditorContent
                editor={editor}
                className={cn(
                    "prose prose-sm max-w-none focus:outline-none text-[14px] leading-relaxed",
                    editable ? "min-h-[120px] p-2 rounded-md ring-0" : "p-0"
                )}
            />

            <style jsx global>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--textMuted);
          pointer-events: none;
          height: 0;
        }
        .ProseMirror:focus {
          outline: none;
        }
        .prose ul { list-style-type: disc; padding-left: 1.5rem; }
        .prose ol { list-style-type: decimal; padding-left: 1.5rem; }
        .prose blockquote { border-left: 3px solid var(--borderStrong); padding-left: 1rem; color: var(--textSecondary); font-style: italic; }
        .prose a { color: var(--infoExecuting); text-decoration: underline; cursor: pointer; }
      `}</style>
        </div>
    )
}

function ToolbarButton({
    active,
    onClick,
    icon,
    label
}: {
    active?: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string
}) {
    return (
        <button
            onClick={onClick}
            title={label}
            className={cn(
                "p-1.5 rounded-md transition-all flex items-center justify-center",
                active
                    ? "bg-accentSurface text-textPrimary shadow-sm"
                    : "text-textMuted hover:bg-surfaceHover hover:text-textPrimary"
            )}
        >
            {icon}
        </button>
    )
}
