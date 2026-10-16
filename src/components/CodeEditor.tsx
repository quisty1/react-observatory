import { useEffect, useRef } from "react";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { basicSetup } from "codemirror";
export function CodeEditor({
  value,
  onChange,
  onRun,
}: {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
}) {
  const root = useRef<HTMLDivElement>(null),
    view = useRef<EditorView | null>(null),
    props = useRef({ onChange, onRun });
  props.current = { onChange, onRun };
  useEffect(() => {
    const v = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          javascript({ jsx: true, typescript: true }),
          keymap.of([
            {
              key: "Mod-Enter",
              run: () => {
                props.current.onRun();
                return true;
              },
            },
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged)
              props.current.onChange(update.state.doc.toString());
          }),
          EditorView.theme({
            "&": { height: "100%", fontSize: "12px" },
            ".cm-scroller": {
              fontFamily: '"JetBrains Mono", monospace',
              lineHeight: "1.95",
              overflow: "auto",
            },
            ".cm-content": { padding: "16px 0" },
            ".cm-gutters": {
              background: "#fafbfd",
              color: "#a0a9b9",
              border: "none",
              paddingRight: "8px",
            },
            ".cm-activeLine": { background: "#edf2ff77" },
            ".cm-activeLineGutter": { background: "#edf2ff" },
            "&.cm-focused": { outline: "none" },
          }),
          EditorView.contentAttributes.of({ "aria-label": "Редактор App.tsx" }),
        ],
      }),
      parent: root.current!,
    });
    view.current = v;
    return () => v.destroy();
  }, []);
  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value)
      v.dispatch({
        changes: { from: 0, to: v.state.doc.length, insert: value },
      });
  }, [value]);
  return <div className="code-editor" ref={root} />;
}
