import React, { useEffect, useRef } from 'react';
import { CodeEditor, CodeEditorWrapper } from '@jupyterlab/codeeditor';
import { CodeMirrorEditor, ybinding } from '@jupyterlab/codemirror';
import { FieldDescriptor } from '../configUtils';
import { YFile } from '@jupyter/ydoc';
import { python } from '@codemirror/lang-python';
import { lineNumbers } from '@codemirror/view';
const INPUT_AREA_EDITOR_CLASS = 'jp-InputArea-editor';

interface CodeTextareaMirrorProps {
  field: FieldDescriptor;
  value: string;
  handleChange: (value: string, id: string) => void;
  advanced: boolean;
}

export const CodeTextareaMirror: React.FC<CodeTextareaMirrorProps> = ({
  field,
  value,
  handleChange,
  advanced,
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const editorWrapperRef = useRef<CodeEditorWrapper | null>(null);
  const sharedModelRef = useRef<YFile | null>(null);

  useEffect(() => {
    if (editorRef.current && !editorWrapperRef.current) {
      // Initialize shared model and editor
      const sharedModel = new YFile();
      sharedModelRef.current = sharedModel;

      const model = new CodeEditor.Model({ sharedModel, mimeType: 'text/x-python' });
      const factory = (options: CodeEditor.IOptions) => {
        const mergedOptions = {
          ...options,
          extensions: [
            ...(options.extensions ?? []),
            ybinding({ ytext: sharedModel.ysource }),
            python(),  // Add Python language support
            lineNumbers()  // Add line numbers
          ]
        };
        return new CodeMirrorEditor(mergedOptions);
      };

      // Create the editor wrapper instance
      editorWrapperRef.current = new CodeEditorWrapper({
        factory,
        model,
        editorOptions: {
          config: { readOnly: true }
        }
      });
      editorWrapperRef.current.addClass(INPUT_AREA_EDITOR_CLASS);


      // Attach the editor wrapper to the DOM
      editorRef.current.appendChild(editorWrapperRef.current.node);

      const initial = value == null ? '' : String(value);
      if (sharedModel.ysource && initial) {
        sharedModel.ysource.insert(0, initial);
      }

      // Sync editor changes to parent component
      sharedModel.ysource.observe(() => {
        const newValue = sharedModel.ysource.toString();
        if (newValue !== String(value ?? '')) {
          handleChange(newValue, field.id);
        }
      });

    }
  }, [field.id, value, handleChange]);

  // Update `ysource` only if `value` is non-empty and different from the current value
  useEffect(() => {
    if (sharedModelRef.current && sharedModelRef.current.ysource) {
      const currentValue = sharedModelRef.current.ysource.toString();
      const next = value == null ? '' : String(value);
      if (next && next !== currentValue) {
        sharedModelRef.current.ysource.delete(0, currentValue.length);
        sharedModelRef.current.ysource.insert(0, next);
      }
    } else {
      console.error("ysource is not initialized correctly during update.");
    }
  }, [value]);

  return <div ref={editorRef} style={{ height: '100%', width: '100%' }} />;
};

export default CodeTextareaMirror;
