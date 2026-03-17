import { useState, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { CalendarDay } from '../hooks/useCalendar';
import type { Task, Holiday } from '../types';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import TaskItem from './TaskItem';

interface CalendarCellProps {
  day: CalendarDay;
  tasks: Task[];
  holidays: Holiday[];
  searchTerm: string;
  onAddTask: (title: string, date: string) => void;
  onEditTask: (id: string, title: string) => void;
  onDeleteTask: (id: string) => void;
  onAttachAudio: (id: string, blob: Blob) => Promise<void>;
  onRemoveAudio: (id: string) => Promise<void>;
  isMobile?: boolean;
}

const CalendarCell = ({
  day,
  tasks,
  holidays,
  searchTerm,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onAttachAudio,
  onRemoveAudio,
  isMobile,
}: CalendarCellProps) => {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { isListening, transcript, isSupported, startListening, stopListening } = useSpeechRecognition();

  const { setNodeRef, isOver } = useDroppable({ id: day.date });

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening((text) => {
        onAddTask(text, day.date);
      });
    }
  };

  const handleAdd = () => {
    const trimmed = newTitle.trim();
    if (trimmed) {
      onAddTask(trimmed, day.date);
    }
    setNewTitle('');
    setAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') {
      setNewTitle('');
      setAdding(false);
    }
  };

  const taskIds = tasks.map((t) => t._id);

  if (isMobile) {
    return (
      <MobileCell ref={setNodeRef} $isOver={isOver}>
        <TasksContainer>
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <TaskItem
                key={task._id}
                task={task}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onAttachAudio={onAttachAudio}
                onRemoveAudio={onRemoveAudio}
                searchTerm={searchTerm}
                isMobile
              />
            ))}
          </SortableContext>
        </TasksContainer>

        {isListening && <ListeningIndicator>{transcript || 'Слушаю...'}</ListeningIndicator>}

        {adding ? (
          <MobileAddInput
            ref={inputRef}
            autoFocus
            value={newTitle}
            placeholder="Add task..."
            onChange={(e) => setNewTitle(e.target.value)}
            onBlur={handleAdd}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <MobileBottomRow>
            <MobileAddBtn onClick={() => setAdding(true)}>+ Add task</MobileAddBtn>
            {isSupported && (
              <MobileMicIconBtn
                onPointerDown={(e) => { e.preventDefault(); handleMicClick(); }}
                $isListening={isListening}
                title={isListening ? 'Stop' : 'Voice input'}
              >
                {isListening ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#d93025">
                    <rect x="6" y="6" width="12" height="12" rx="2"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="2" width="6" height="11" rx="3"/>
                    <path d="M5 10a7 7 0 0 0 14 0"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                    <line x1="9" y1="21" x2="15" y2="21"/>
                  </svg>
                )}
              </MobileMicIconBtn>
            )}
          </MobileBottomRow>
        )}
      </MobileCell>
    );
  }

  return (
    <Cell
      ref={setNodeRef}
      $isCurrentMonth={day.isCurrentMonth}
      $isToday={day.isToday}
      $isOver={isOver}
    >
      <DayNumber $isToday={day.isToday}>{day.dayOfMonth}</DayNumber>

      {holidays.map((h) => (
        <HolidayLabel key={h.name} title={h.name}>
          {h.localName}
        </HolidayLabel>
      ))}

      <TasksContainer>
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskItem
              key={task._id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onAttachAudio={onAttachAudio}
              onRemoveAudio={onRemoveAudio}
              searchTerm={searchTerm}
            />
          ))}
        </SortableContext>
      </TasksContainer>

      {isListening && <ListeningIndicator>🎙 {transcript || 'Listening...'}</ListeningIndicator>}

      {adding ? (
        <AddInput
          ref={inputRef}
          autoFocus
          value={newTitle}
          placeholder="Task title..."
          onChange={(e) => setNewTitle(e.target.value)}
          onBlur={handleAdd}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <AddRow>
          <AddButton onClick={() => setAdding(true)}>+</AddButton>
          {isSupported && (
            <MicButton onClick={handleMicClick} $isListening={isListening}>
              {isListening ? '⏹' : '🎙'}
            </MicButton>
          )}
        </AddRow>
      )}
    </Cell>
  );
};

export default CalendarCell;

const Cell = styled.div<{ $isCurrentMonth: boolean; $isToday: boolean; $isOver: boolean }>`
  border: 1px solid #e0e0e0;
  padding: 4px;
  min-height: 100px;
  display: flex;
  flex-direction: column;
  background: ${({ $isCurrentMonth, $isOver }) =>
    $isOver ? '#e3f2fd' : $isCurrentMonth ? '#fff' : '#f5f5f5'};
  opacity: ${({ $isCurrentMonth }) => ($isCurrentMonth ? 1 : 0.6)};
  overflow: hidden;
  position: relative;
  transition: background 0.15s;
`;

const DayNumber = styled.span<{ $isToday: boolean }>`
  font-size: 13px;
  font-weight: ${({ $isToday }) => ($isToday ? 700 : 400)};
  color: ${({ $isToday }) => ($isToday ? '#fff' : '#333')};
  background: ${({ $isToday }) => ($isToday ? '#4285f4' : 'transparent')};
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  margin-bottom: 2px;
  flex-shrink: 0;
`;

const HolidayLabel = styled.div`
  font-size: 10px;
  color: #d32f2f;
  background: #fce4ec;
  padding: 1px 4px;
  border-radius: 2px;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
`;

const TasksContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  min-height: 0;
`;

const AddInput = styled.input`
  width: 100%;
  border: 1px solid #4285f4;
  border-radius: 2px;
  padding: 2px 4px;
  font-size: 11px;
  outline: none;
  box-sizing: border-box;
  flex-shrink: 0;
`;

const AddRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-shrink: 0;
  opacity: 0;

  ${Cell}:hover & {
    opacity: 1;
  }
`;

const AddButton = styled.button`
  border: none;
  background: none;
  color: #999;
  cursor: pointer;
  font-size: 16px;
  padding: 0;
  line-height: 1;

  &:hover {
    color: #4285f4;
  }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const MicButton = styled.button<{ $isListening: boolean }>`
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  padding: 0;
  line-height: 1;
  animation: ${({ $isListening }) => ($isListening ? pulse : 'none')} 1s infinite;

  &:hover {
    transform: scale(1.2);
  }
`;

const ListeningIndicator = styled.div`
  font-size: 11px;
  color: #d93025;
  padding: 2px 6px;
  background: #fce4ec;
  border-radius: 4px;
  margin-bottom: 2px;
  text-align: center;
  animation: ${pulse} 1.2s infinite;
`;

const MobileCell = styled.div<{ $isOver: boolean }>`
  background: ${({ $isOver }) => ($isOver ? '#e3f2fd' : 'transparent')};
  transition: background 0.15s;
`;

const MobileAddInput = styled.input`
  width: 100%;
  border: 1px solid #4285f4;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  margin-top: 4px;
`;

const MobileBottomRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 2px;
`;

const MobileAddBtn = styled.button`
  border: none;
  background: none;
  color: #bbb;
  cursor: pointer;
  font-size: 13px;
  padding: 4px 0;
`;

const MobileMicIconBtn = styled.button<{ $isListening: boolean }>`
  border: none;
  background: ${({ $isListening }) => ($isListening ? '#fce4ec' : 'transparent')};
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  color: ${({ $isListening }) => ($isListening ? '#d93025' : '#ccc')};
  animation: ${({ $isListening }) => ($isListening ? pulse : 'none')} 1s infinite;
  transition: background 0.2s, color 0.2s;
`;
