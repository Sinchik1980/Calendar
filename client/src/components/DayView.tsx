import { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import type { Task } from '../types';

interface DayViewProps {
  date: string; // YYYY-MM-DD
  tasks: Task[];
  onBack: () => void;
  onAddTask: (title: string, date: string, time?: string) => Promise<Task | void>;
  onEditTask: (id: string, title: string) => void;
  onDeleteTask: (id: string) => void;
  onAttachAudio: (id: string, blob: Blob) => Promise<void>;
  onRemoveAudio: (id: string) => Promise<void>;
}

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`);
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:30`);
}

const SERVER_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

const DayView = ({
  date,
  tasks,
  onBack,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onAttachAudio,
  onRemoveAudio,
}: DayViewProps) => {
  const [addingNote, setAddingNote] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventTime, setEventTime] = useState('09:00');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [showPlayerId, setShowPlayerId] = useState<string | null>(null);
  const mediaRecorderRef = useState<MediaRecorder | null>(null);

  const { isListening, transcript, isSupported, startListening, stopListening } = useSpeechRecognition();

  const notes = tasks.filter(t => !t.time).sort((a, b) => a.order - b.order);
  const events = tasks.filter(t => t.time).sort((a, b) => (a.time! > b.time! ? 1 : -1));

  const d = new Date(date + 'T12:00:00');
  const dayLabel = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' });

  const handleAddNote = async () => {
    const t = noteTitle.trim();
    if (t) await onAddTask(t, date);
    setNoteTitle('');
    setAddingNote(false);
  };

  const handleAddEvent = async () => {
    const t = eventTitle.trim();
    if (t) await onAddTask(t, date, eventTime);
    setEventTitle('');
    setEventTime('09:00');
    setAddingEvent(false);
  };

  const handleSaveEdit = (task: Task) => {
    const t = editValue.trim();
    if (t && t !== task.title) onEditTask(task._id, t);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Удалить?')) onDeleteTask(id);
  };

  const startRecording = async (taskId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        await onAttachAudio(taskId, blob);
        setRecordingId(null);
        setShowPlayerId(taskId);
      };
      mr.start();
      (mediaRecorderRef as unknown as { current: MediaRecorder }).current = mr;
      setRecordingId(taskId);
    } catch {
      alert('Нет доступа к микрофону');
    }
  };

  const stopRecording = () => {
    const mr = (mediaRecorderRef as unknown as { current: MediaRecorder | null }).current;
    mr?.stop();
  };

  const audioUrl = (task: Task) =>
    task.audioUrl
      ? task.audioUrl.startsWith('http') ? task.audioUrl : `${SERVER_BASE}${task.audioUrl}`
      : null;

  const renderTask = (task: Task, index?: number) => (
    <TaskRow key={task._id}>
      {index !== undefined && <TaskIndex>{index + 1}.</TaskIndex>}
      {task.time && <TaskTime>{task.time}</TaskTime>}

      <TaskContent>
        {editingId === task._id ? (
          <EditInput
            autoFocus
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={() => handleSaveEdit(task)}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(task); if (e.key === 'Escape') setEditingId(null); }}
          />
        ) : (
          <TaskTitle onClick={() => { setEditingId(task._id); setEditValue(task.title); }}>
            {task.title}
          </TaskTitle>
        )}

        {showPlayerId === task._id && audioUrl(task) && (
          <AudioRow>
            <audio controls src={audioUrl(task)!} style={{ height: 28, flex: 1 }} />
            <SmallBtn onClick={async () => { await onRemoveAudio(task._id); setShowPlayerId(null); }}>×</SmallBtn>
          </AudioRow>
        )}
      </TaskContent>

      <RowActions>
        {audioUrl(task) && showPlayerId !== task._id && (
          <IconBtn onClick={() => setShowPlayerId(task._id)} title="Прослушать">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#4285f4">
              <path d="M3 9a3 3 0 0 1 3-3h2l4-4v18l-4-4H6a3 3 0 0 1-3-3V9z"/>
            </svg>
          </IconBtn>
        )}
        {recordingId === task._id ? (
          <IconBtn onClick={stopRecording} title="Стоп">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#d93025">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          </IconBtn>
        ) : (
          <IconBtn onClick={() => startRecording(task._id)} title="Записать аудио" $recording={recordingId === task._id}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
              <rect x="9" y="2" width="6" height="11" rx="3"/>
              <path d="M5 10a7 7 0 0 0 14 0"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
              <line x1="9" y1="21" x2="15" y2="21"/>
            </svg>
          </IconBtn>
        )}
        <IconBtn onClick={() => handleDelete(task._id)} $danger>×</IconBtn>
      </RowActions>
    </TaskRow>
  );

  return (
    <Container>
      <Header>
        <BackBtn onClick={onBack}>←</BackBtn>
        <DayTitle>{dayLabel}</DayTitle>
      </Header>

      <Section>
        <SectionHeader>
          <SectionIcon>📋</SectionIcon>
          <SectionTitle>Заметки</SectionTitle>
          <SectionActions>
            {isSupported && (
              <MicBtn
                onPointerDown={e => {
                  e.preventDefault();
                  if (isListening) stopListening();
                  else startListening(text => onAddTask(text, date));
                }}
                $active={isListening}
              >
                {isListening ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#d93025"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="2" width="6" height="11" rx="3"/>
                    <path d="M5 10a7 7 0 0 0 14 0"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                    <line x1="9" y1="21" x2="15" y2="21"/>
                  </svg>
                )}
              </MicBtn>
            )}
            <AddBtn onClick={() => setAddingNote(true)}>+</AddBtn>
          </SectionActions>
        </SectionHeader>

        {isListening && <ListeningBadge>{transcript || 'Слушаю...'}</ListeningBadge>}

        {notes.map((task, i) => renderTask(task, i))}

        {addingNote && (
          <AddRow>
            <AddInput
              autoFocus
              placeholder="Новая заметка..."
              value={noteTitle}
              onChange={e => setNoteTitle(e.target.value)}
              onBlur={handleAddNote}
              onKeyDown={e => { if (e.key === 'Enter') handleAddNote(); if (e.key === 'Escape') setAddingNote(false); }}
            />
          </AddRow>
        )}

        {notes.length === 0 && !addingNote && (
          <Empty>Нет заметок</Empty>
        )}
      </Section>

      <Section>
        <SectionHeader>
          <SectionIcon>🕐</SectionIcon>
          <SectionTitle>События</SectionTitle>
          <SectionActions>
            <AddBtn onClick={() => setAddingEvent(true)}>+</AddBtn>
          </SectionActions>
        </SectionHeader>

        {events.map(task => renderTask(task))}

        {addingEvent && (
          <AddEventRow>
            <TimeSelect value={eventTime} onChange={e => setEventTime(e.target.value)}>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </TimeSelect>
            <AddInput
              autoFocus
              placeholder="Название события..."
              value={eventTitle}
              onChange={e => setEventTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddEvent(); if (e.key === 'Escape') setAddingEvent(false); }}
              style={{ flex: 1 }}
            />
            <ConfirmBtn onClick={handleAddEvent}>✓</ConfirmBtn>
          </AddEventRow>
        )}

        {events.length === 0 && !addingEvent && (
          <Empty>Нет событий</Empty>
        )}
      </Section>
    </Container>
  );
};

export default DayView;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f8f9fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  position: sticky;
  top: 0;
  z-index: 10;
`;

const BackBtn = styled.button`
  border: none;
  background: none;
  font-size: 22px;
  cursor: pointer;
  padding: 4px 8px;
  color: #4285f4;
  line-height: 1;
`;

const DayTitle = styled.h2`
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #333;
  text-transform: capitalize;
`;

const Section = styled.div`
  margin: 12px;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
`;

const SectionIcon = styled.span`font-size: 18px;`;

const SectionTitle = styled.span`
  font-size: 15px;
  font-weight: 600;
  color: #333;
  flex: 1;
`;

const SectionActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const AddBtn = styled.button`
  border: none;
  background: #4285f4;
  color: #fff;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
`;

const pulse = keyframes`0%,100%{opacity:1}50%{opacity:0.4}`;

const MicBtn = styled.button<{ $active?: boolean }>`
  border: none;
  background: ${({ $active }) => ($active ? '#fce4ec' : '#f1f3f4')};
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${({ $active }) => ($active ? '#d93025' : '#666')};
  animation: ${({ $active }) => ($active ? pulse : 'none')} 1s infinite;
`;

const pulse2 = keyframes`0%,100%{opacity:1}50%{opacity:0.5}`;

const ListeningBadge = styled.div`
  font-size: 13px;
  color: #d93025;
  background: #fce4ec;
  padding: 6px 16px;
  animation: ${pulse2} 1.2s infinite;
`;

const TaskRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #f5f5f5;
  &:last-child { border-bottom: none; }
`;

const TaskIndex = styled.span`
  font-size: 13px;
  color: #999;
  min-width: 20px;
  flex-shrink: 0;
`;

const TaskTime = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #4285f4;
  min-width: 44px;
  flex-shrink: 0;
`;

const TaskContent = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const TaskTitle = styled.span`
  font-size: 15px;
  color: #333;
  cursor: text;
`;

const EditInput = styled.input`
  width: 100%;
  border: 1px solid #4285f4;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 15px;
  outline: none;
  box-sizing: border-box;
`;

const AudioRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const SmallBtn = styled.button`
  border: none;
  background: none;
  color: #d93025;
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
`;

const RowActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`;

const IconBtn = styled.button<{ $danger?: boolean; $recording?: boolean }>`
  border: none;
  background: none;
  cursor: pointer;
  padding: 4px;
  font-size: ${({ $danger }) => ($danger ? '18px' : '14px')};
  color: ${({ $danger }) => ($danger ? '#d93025' : 'inherit')};
  display: flex;
  align-items: center;
  line-height: 1;
`;

const AddRow = styled.div`
  padding: 8px 16px;
`;

const AddInput = styled.input`
  border: 1px solid #4285f4;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 15px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
`;

const AddEventRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
`;

const TimeSelect = styled.select`
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 8px 4px;
  font-size: 14px;
  color: #4285f4;
  font-weight: 600;
  outline: none;
  background: #fff;
  flex-shrink: 0;
`;

const ConfirmBtn = styled.button`
  border: none;
  background: #4285f4;
  color: #fff;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 16px;
  cursor: pointer;
  flex-shrink: 0;
`;

const Empty = styled.div`
  padding: 16px;
  font-size: 13px;
  color: #bbb;
  text-align: center;
`;
