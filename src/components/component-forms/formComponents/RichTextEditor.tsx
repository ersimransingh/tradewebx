import React, { useEffect, useRef, useState } from "react";

interface RichTextEditorProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  error?: boolean;
  placeholder?: string;
  maxLength?: number;
  colors?: {
    textInputBackground?: string;
    textInputText?: string;
    text?: string;
  };
  isJustUpdated?: boolean;
  ariaRequired?: boolean;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  id,
  value,
  onChange,
  onBlur,
  disabled = false,
  error = false,
  placeholder,
  maxLength,
  colors,
  isJustUpdated = false,
  ariaRequired,
  ariaInvalid,
  ariaDescribedBy
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const valueRef = useRef(value);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const stripHtml = (html: string) =>
    html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim();

  const saveSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;
    const range = selection.getRangeAt(0);
    if (editorRef.current.contains(range.commonAncestorContainer)) {
      selectionRef.current = range;
    }
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (!selection || !selectionRef.current) return;
    selection.removeAllRanges();
    selection.addRange(selectionRef.current);
  };

  const enforceMaxLength = (html: string) => {
    if (!maxLength) return html;
    const plainText = stripHtml(html);
    if (plainText.length <= maxLength) return html;
    return valueRef.current || "";
  };

  const handleInput = () => {
    if (!editorRef.current) return;
    saveSelection();
    const html = editorRef.current.innerHTML;
    const sanitizedHtml = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
    const finalHtml = enforceMaxLength(sanitizedHtml);

    if (finalHtml !== sanitizedHtml) {
      editorRef.current.innerHTML = finalHtml;
      return;
    }

    if (finalHtml !== valueRef.current) {
      onChange(finalHtml);
    }
  };

  const applyCommand = (command: string, commandValue?: string) => {
    if (disabled) return;
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(command, false, commandValue);
    saveSelection();
    handleInput();
  };

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    setIsFocused(false);
    if (containerRef.current?.contains(event.relatedTarget as Node)) {
      return;
    }
    onBlur?.();
  };

  const isEmpty = stripHtml(value || "").length === 0;
  const toolbarButtonClass = `px-2 py-1 text-xs border rounded-md ${
    disabled
      ? "bg-gray-100 text-gray-400 border-gray-200"
      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
  }`;

  return (
    <div ref={containerRef} className="w-full">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <button
          type="button"
          className={toolbarButtonClass}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyCommand("bold")}
          aria-label="Bold"
          disabled={disabled}
        >
          B
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyCommand("italic")}
          aria-label="Italic"
          disabled={disabled}
        >
          I
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyCommand("underline")}
          aria-label="Underline"
          disabled={disabled}
        >
          U
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyCommand("insertUnorderedList")}
          aria-label="Bulleted list"
          disabled={disabled}
        >
          UL
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyCommand("insertOrderedList")}
          aria-label="Numbered list"
          disabled={disabled}
        >
          OL
        </button>
        <label className="flex items-center gap-2 text-xs">
          <span style={{ color: colors?.text || "#111827" }}>Color</span>
          <input
            type="color"
            className="h-7 w-7 border rounded"
            disabled={disabled}
            onChange={(event) => applyCommand("foreColor", event.target.value)}
            aria-label="Text color"
          />
        </label>
      </div>
      <div className="relative">
        {placeholder && isEmpty && !isFocused && (
          <div className="pointer-events-none absolute left-3 top-2 text-gray-400 text-sm">
            {placeholder}
          </div>
        )}
        <div
          id={id}
          ref={editorRef}
          contentEditable={!disabled}
          role="textbox"
          aria-multiline="true"
          aria-required={ariaRequired}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : 0}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
            disabled ? "border-gray-300" : error ? "border-red-500" : "border-gray-700"
          }`}
          style={{
            minHeight: "120px",
            backgroundColor: disabled ? "#f2f2f0" : colors?.textInputBackground,
            color: isJustUpdated ? "#22c55e" : colors?.textInputText,
            whiteSpace: "pre-wrap"
          }}
          onInput={handleInput}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          onFocus={() => {
            setIsFocused(true);
            saveSelection();
          }}
          onBlur={handleBlur}
        />
      </div>
    </div>
  );
};

export default RichTextEditor;
