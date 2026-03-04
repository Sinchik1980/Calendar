import { useState, useMemo } from 'react';
import styled from 'styled-components';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useCalendar } from '../hooks/useCalendar';
import { useTasks } from '../hooks/useTasks';
import { useHolidays } from '../hooks/useHolidays';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import type { Task } from '../types';
import CalendarCell from './CalendarCell';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const Calendar = () => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'agenda' | 'grid'>('agenda');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();

  const { days, startDate, endDate } = useCalendar(year, month);
  const { tasks, addTask, editTask, removeTask, moveTask } = useTasks(startDate, endDate, search);
  const holidays = useHolidays(year);

  const prevYearHolidays = useHolidays(year - 1);
  const nextYearHolidays = useHolidays(year + 1);

  const allHolidays = useMemo(() => {
    const merged = new Map<string, typeof holidays extends Map<string, infer V> ? V : never>();
    [prevYearHolidays, holidays, nextYearHolidays].forEach((hMap) => {
      hMap.forEach((v, k) => merged.set(k, v));
    });
    return merged;
  }, [prevYearHolidays, holidays, nextYearHolidays]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((t) => {
      const arr = map.get(t.date) || [];
      arr.push(t);
      map.set(t.date, arr);
    });
    map.forEach((arr) => arr.sort((a, b) => a.order - b.order));
    return map;
  }, [tasks]);

  const agendaDays = useMemo(() => {
    if (!isMobile) return days;
    return days.filter((d) => d.isCurrentMonth);
  }, [days, isMobile]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const goToPrevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };

  const goToNextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const goToToday = () => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  };

  const monthName = new Date(year, month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task | undefined;
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over || !active) return;

    const taskId = active.id as string;
    const task = tasks.find((t) => t._id === taskId);
    if (!task) return;

    let targetDate: string;
    let targetOrder: number;

    const overTask = tasks.find((t) => t._id === over.id);
    if (overTask) {
      targetDate = overTask.date;
      targetOrder = overTask.order;
    } else {
      targetDate = over.id as string;
      const cellTasks = tasksByDate.get(targetDate) || [];
      targetOrder = cellTasks.length;
    }

    if (task.date === targetDate && task.order === targetOrder) return;
    await moveTask(taskId, targetDate, targetOrder);
  };

  const handleEditTask = async (id: string, title: string) => {
    await editTask(id, { title });
  };

  return (
    <Container>
      <Header>
        <NavSection>
          <NavBtn onClick={goToPrevMonth}>&lt;</NavBtn>
          <MonthTitle>{monthName}</MonthTitle>
          <NavBtn onClick={goToNextMonth}>&gt;</NavBtn>
          <TodayBtn onClick={goToToday}>Today</TodayBtn>
        </NavSection>
        <RightSection>
          {isMobile ? (
            <>
              <IconBtn onClick={() => setMobileView(mobileView === 'agenda' ? 'grid' : 'agenda')}>
                {mobileView === 'agenda' ? '\u25A6' : '\u2630'}
              </IconBtn>
              <IconBtn onClick={() => setSearchOpen(!searchOpen)}>
                {searchOpen ? '\u2715' : '\uD83D\uDD0D'}
              </IconBtn>
              <IconBtn onClick={logout}>{'\u21AA'}</IconBtn>
            </>
          ) : (
            <>
              <SearchInput
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {user && (
                <UserSection>
                  <UserName>{user.name}</UserName>
                  <LogoutBtn onClick={logout}>Logout</LogoutBtn>
                </UserSection>
              )}
            </>
          )}
        </RightSection>
      </Header>

      {isMobile && searchOpen && (
        <MobileSearchBar
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {isMobile && mobileView === 'grid' ? (
          <>
            <MobileWeekdayRow>
              {WEEKDAYS.map((wd) => (
                <MobileWeekday key={wd}>{wd}</MobileWeekday>
              ))}
            </MobileWeekdayRow>
            <MobileGrid>
              {days.map((day) => {
                const dayTasks = tasksByDate.get(day.date) || [];
                const dayHolidays = allHolidays.get(day.date) || [];
                return (
                  <MobileGridCell
                    key={day.date}
                    $isCurrentMonth={day.isCurrentMonth}
                    $isToday={day.isToday}
                    $hasTasks={dayTasks.length > 0}
                    $hasHoliday={dayHolidays.length > 0}
                  >
                    <MobileGridDay $isToday={day.isToday}>{day.dayOfMonth}</MobileGridDay>
                    {dayTasks.length > 0 && (
                      <MobileGridDots>
                        {dayTasks.slice(0, 3).map((t) => (
                          <MobileGridDot key={t._id} />
                        ))}
                        {dayTasks.length > 3 && <MobileGridMore>+{dayTasks.length - 3}</MobileGridMore>}
                      </MobileGridDots>
                    )}
                    {dayHolidays.length > 0 && <MobileGridHolidayDot />}
                  </MobileGridCell>
                );
              })}
            </MobileGrid>
          </>
        ) : isMobile ? (
          <AgendaList>
            {agendaDays.map((day) => {
              const dayTasks = tasksByDate.get(day.date) || [];
              const dayHolidays = allHolidays.get(day.date) || [];
              const weekday = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });

              return (
                <AgendaDay key={day.date} $isToday={day.isToday}>
                  <AgendaDayHeader>
                    <AgendaDate $isToday={day.isToday}>
                      <span>{day.dayOfMonth}</span>
                      <AgendaWeekday>{weekday}</AgendaWeekday>
                    </AgendaDate>
                    {dayHolidays.map((h) => (
                      <AgendaHoliday key={h.name}>{h.localName}</AgendaHoliday>
                    ))}
                  </AgendaDayHeader>
                  <CalendarCell
                    day={day}
                    tasks={dayTasks}
                    holidays={[]}
                    searchTerm={search}
                    onAddTask={addTask}
                    onEditTask={handleEditTask}
                    onDeleteTask={removeTask}
                    isMobile
                  />
                </AgendaDay>
              );
            })}
          </AgendaList>
        ) : (
          <>
            <WeekdayRow>
              {WEEKDAYS.map((wd) => (
                <Weekday key={wd}>{wd}</Weekday>
              ))}
            </WeekdayRow>
            <Grid>
              {days.map((day) => (
                <CalendarCell
                  key={day.date}
                  day={day}
                  tasks={tasksByDate.get(day.date) || []}
                  holidays={allHolidays.get(day.date) || []}
                  searchTerm={search}
                  onAddTask={addTask}
                  onEditTask={handleEditTask}
                  onDeleteTask={removeTask}
                />
              ))}
            </Grid>
          </>
        )}

        <DragOverlay>
          {activeTask && <DragOverlayItem>{activeTask.title}</DragOverlayItem>}
        </DragOverlay>
      </DndContext>
    </Container>
  );
};

export default Calendar;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  @media (max-width: 768px) { padding: 8px; }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
  @media (max-width: 768px) { margin-bottom: 8px; }
`;

const NavSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  @media (max-width: 768px) { gap: 4px; }
`;

const NavBtn = styled.button`
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 16px;
  min-width: 40px;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover { background: #f0f0f0; }
`;

const TodayBtn = styled(NavBtn)`
  font-size: 13px;
  margin-left: 4px;
`;

const MonthTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  min-width: 160px;
  text-align: center;
  @media (max-width: 768px) { font-size: 16px; min-width: 120px; }
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SearchInput = styled.input`
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  width: 240px;
  outline: none;
  &:focus { border-color: #4285f4; }
`;

const IconBtn = styled.button`
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;
  min-width: 40px;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
`;

const MobileSearchBar = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  outline: none;
  margin-bottom: 8px;
  box-sizing: border-box;
  &:focus { border-color: #4285f4; }
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const UserName = styled.span`
  font-size: 13px;
  color: #666;
`;

const LogoutBtn = styled.button`
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 12px;
  color: #666;
  &:hover { background: #f0f0f0; color: #d93025; }
`;

const WeekdayRow = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
`;

const Weekday = styled.div`
  text-align: center;
  font-weight: 600;
  font-size: 13px;
  color: #666;
  padding: 8px 0;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
`;

const AgendaList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const AgendaDay = styled.div<{ $isToday: boolean }>`
  background: ${({ $isToday }) => ($isToday ? '#e8f0fe' : '#fff')};
  border: 1px solid ${({ $isToday }) => ($isToday ? '#4285f4' : '#e0e0e0')};
  border-radius: 8px;
  padding: 8px 12px;
`;

const AgendaDayHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
`;

const AgendaDate = styled.div<{ $isToday: boolean }>`
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-size: 18px;
  font-weight: ${({ $isToday }) => ($isToday ? 700 : 500)};
  color: ${({ $isToday }) => ($isToday ? '#4285f4' : '#333')};
`;

const AgendaWeekday = styled.span`
  font-size: 12px;
  color: #999;
  font-weight: 400;
`;

const AgendaHoliday = styled.span`
  font-size: 11px;
  color: #d32f2f;
  background: #fce4ec;
  padding: 2px 6px;
  border-radius: 4px;
`;

const MobileWeekdayRow = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 2px;
`;

const MobileWeekday = styled.div`
  text-align: center;
  font-weight: 600;
  font-size: 11px;
  color: #999;
  padding: 4px 0;
`;

const MobileGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: #e0e0e0;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
`;

const MobileGridCell = styled.div<{
  $isCurrentMonth: boolean;
  $isToday: boolean;
  $hasTasks: boolean;
  $hasHoliday: boolean;
}>`
  background: ${({ $isToday, $isCurrentMonth }) =>
    $isToday ? '#e8f0fe' : $isCurrentMonth ? '#fff' : '#f9f9f9'};
  padding: 4px 2px;
  min-height: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: ${({ $isCurrentMonth }) => ($isCurrentMonth ? 1 : 0.5)};
`;

const MobileGridDay = styled.span<{ $isToday: boolean }>`
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
`;

const MobileGridDots = styled.div`
  display: flex;
  gap: 2px;
  align-items: center;
  margin-top: 2px;
`;

const MobileGridDot = styled.div`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #4285f4;
`;

const MobileGridMore = styled.span`
  font-size: 8px;
  color: #4285f4;
  font-weight: 600;
`;

const MobileGridHolidayDot = styled.div`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #d32f2f;
  margin-top: 1px;
`;

const DragOverlayItem = styled.div`
  padding: 4px 8px;
  background: #e8f0fe;
  border: 1px solid #4285f4;
  border-radius: 4px;
  font-size: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: grabbing;
`;
