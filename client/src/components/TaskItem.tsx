import { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../types';

interface TaskItemProps {
  task: Task;
  onEdit: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  searchTerm: string;
}

const TaskItem = ({ task, onEdit, onDelete, searchTerm }: TaskItemProps) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id, data: { task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== task.title) {
      onEdit(task._id, trimmed);
    } else {
      setValue(task.title);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setValue(task.title);
      setEditing(false);
    }
  };

  const highlightText = (text: string) => {
    if (!searchTerm) return text;
    const idx = text.toLowerCase().indexOf(searchTerm.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <Highlight>{text.slice(idx, idx + searchTerm.length)}</Highlight>
        {text.slice(idx + searchTerm.length)}
      </>
    );
  };

  return (
    <Wrapper ref={setNodeRef} style={style}>
      <DragHandle {...attributes} {...listeners}>⠿</DragHandle>
      {editing ? (
        <EditInput
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <TaskText onDoubleClick={() => setEditing(true)}>
          {highlightText(task.title)}
        </TaskText>
      )}
      <DeleteBtn onClick={() => onDelete(task._id)}>×</DeleteBtn>
    </Wrapper>
  );
};

export default TaskItem;

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
  margin: 1px 0;
  background: #e8f0fe;
  border-radius: 4px;
  font-size: 12px;
  cursor: default;

  &:hover button {
    opacity: 1;
  }
`;

const DragHandle = styled.span`
  cursor: grab;
  color: #999;
  font-size: 10px;
  user-select: none;
  flex-shrink: 0;

  &:active {
    cursor: grabbing;
  }
`;

const TaskText = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: text;
`;

const EditInput = styled.input`
  flex: 1;
  min-width: 0;
  border: 1px solid #4285f4;
  border-radius: 2px;
  padding: 1px 4px;
  font-size: 12px;
  outline: none;
`;

const DeleteBtn = styled.button`
  border: none;
  background: none;
  color: #d93025;
  cursor: pointer;
  font-size: 14px;
  padding: 0 2px;
  opacity: 0;
  flex-shrink: 0;
  line-height: 1;

  &:hover {
    color: #a50e0e;
  }
`;

const Highlight = styled.span`
  background: #fff2ac;
  border-radius: 2px;
`;
