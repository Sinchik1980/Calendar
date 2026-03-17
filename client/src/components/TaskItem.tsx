import { useState, useRef, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../types';

const SERVER_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

interface TaskItemProps {
  task: Task;
  onEdit: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onAttachAudio: (id: string, blob: Blob) => Promise<void>;
  onRemoveAudio: (id: string) => Promise<void>;
  searchTerm: string;
  isMobile?: boolean;
}

const TaskItem = ({ task, onEdit, onDelete, onAttachAudio, onRemoveAudio, searchTerm, isMobile }: TaskItemProps) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.title);
  const [showPlayer, setShowPlayer] = useState(false);
  const [recording, setRecording] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await onAttachAudio(task._id, blob);
        setRecording(false);
        setShowPlayer(true);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch {
      alert('Microphone access denied');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
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

  const audioSrc = task.audioUrl
    ? task.audioUrl.startsWith('http') ? task.audioUrl : `${SERVER_BASE}${task.audioUrl}`
    : null;

  return (
    <Wrapper ref={setNodeRef} style={style} $isMobile={isMobile}>
      <DragHandle {...attributes} {...listeners} $isMobile={isMobile}>⠿</DragHandle>

      <Content>
        {editing ? (
          <EditInput
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            $isMobile={isMobile}
          />
        ) : (
          <TaskText
            onDoubleClick={() => setEditing(true)}
            onClick={isMobile ? () => setEditing(true) : undefined}
            $isMobile={isMobile}
          >
            {highlightText(task.title)}
          </TaskText>
        )}

        {showPlayer && audioSrc && (
          <AudioRow>
            <audio controls src={audioSrc} style={{ height: 28, flex: 1, minWidth: 0 }} />
            <RemoveAudioBtn
              onClick={async () => { await onRemoveAudio(task._id); setShowPlayer(false); }}
              title="Delete audio"
            >×</RemoveAudioBtn>
          </AudioRow>
        )}
      </Content>

      <Actions $isMobile={isMobile}>
        {audioSrc && !showPlayer && (
          <AudioIconBtn onClick={() => setShowPlayer(true)} title="Play recording">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9a3 3 0 0 1 3-3h2l4-4v18l-4-4H6a3 3 0 0 1-3-3V9zm16.07-2.07a9 9 0 0 1 0 12.14M19 12a7 7 0 0 0-2.07-4.93"/>
              <circle cx="12" cy="12" r="1.5"/>
            </svg>
          </AudioIconBtn>
        )}

        {recording ? (
          <RecordBtn onClick={stopRecording} title="Stop recording">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#d93025">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          </RecordBtn>
        ) : (
          <RecordBtn onClick={startRecording} title="Record audio" $dimmed>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="2" width="6" height="11" rx="3"/>
              <path d="M5 10a7 7 0 0 0 14 0"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
              <line x1="9" y1="21" x2="15" y2="21"/>
            </svg>
          </RecordBtn>
        )}

        <DeleteBtn onClick={() => { if (window.confirm('Delete this task?')) onDelete(task._id); }} $isMobile={isMobile}>×</DeleteBtn>
      </Actions>
    </Wrapper>
  );
};

export default TaskItem;

const Wrapper = styled.div<{ $isMobile?: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ $isMobile }) => ($isMobile ? '8px' : '4px')};
  padding: ${({ $isMobile }) => ($isMobile ? '8px' : '2px 4px')};
  margin: ${({ $isMobile }) => ($isMobile ? '2px 0' : '1px 0')};
  background: #e8f0fe;
  border-radius: ${({ $isMobile }) => ($isMobile ? '6px' : '4px')};
  font-size: ${({ $isMobile }) => ($isMobile ? '14px' : '12px')};
  cursor: default;
  touch-action: ${({ $isMobile }) => ($isMobile ? 'none' : 'auto')};

  &:hover button {
    opacity: 1;
  }
`;

const DragHandle = styled.span<{ $isMobile?: boolean }>`
  cursor: grab;
  color: #999;
  font-size: ${({ $isMobile }) => ($isMobile ? '16px' : '10px')};
  user-select: none;
  flex-shrink: 0;
  padding: ${({ $isMobile }) => ($isMobile ? '4px 0' : '0')};
  touch-action: none;

  &:active {
    cursor: grabbing;
  }
`;

const Content = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const TaskText = styled.span<{ $isMobile?: boolean }>`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: text;
  padding: ${({ $isMobile }) => ($isMobile ? '2px 0' : '0')};
  display: block;
`;

const EditInput = styled.input<{ $isMobile?: boolean }>`
  width: 100%;
  border: 1px solid #4285f4;
  border-radius: ${({ $isMobile }) => ($isMobile ? '4px' : '2px')};
  padding: ${({ $isMobile }) => ($isMobile ? '6px 8px' : '1px 4px')};
  font-size: ${({ $isMobile }) => ($isMobile ? '14px' : '12px')};
  outline: none;
  box-sizing: border-box;
`;

const AudioRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const RemoveAudioBtn = styled.button`
  border: none;
  background: none;
  color: #d93025;
  cursor: pointer;
  font-size: 16px;
  padding: 0 2px;
  line-height: 1;
  flex-shrink: 0;
`;

const Actions = styled.div<{ $isMobile?: boolean }>`
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
`;

const RecordBtn = styled.button<{ $dimmed?: boolean }>`
  border: none;
  background: none;
  cursor: pointer;
  padding: 2px;
  line-height: 1;
  display: flex;
  align-items: center;
  color: ${({ $dimmed }) => ($dimmed ? '#aaa' : '#d93025')};
  opacity: ${({ $dimmed }) => ($dimmed ? 0 : 1)};
  animation: ${({ $dimmed }) => ($dimmed ? 'none' : pulse)} 1s infinite;

  ${Wrapper}:hover & {
    opacity: 1;
  }
`;

const AudioIconBtn = styled.button`
  border: none;
  background: none;
  cursor: pointer;
  padding: 2px;
  color: #4285f4;
  display: flex;
  align-items: center;
  opacity: 0;

  ${Wrapper}:hover & {
    opacity: 1;
  }
`;

const DeleteBtn = styled.button<{ $isMobile?: boolean }>`
  border: none;
  background: none;
  color: #d93025;
  cursor: pointer;
  font-size: ${({ $isMobile }) => ($isMobile ? '20px' : '14px')};
  padding: ${({ $isMobile }) => ($isMobile ? '0 4px' : '0 2px')};
  opacity: ${({ $isMobile }) => ($isMobile ? 1 : 0)};
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
