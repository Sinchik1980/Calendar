import { useState, useMemo } from 'react';
import styled from 'styled-components';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useCalendar } from '../hooks/useCalendar';
import { useTasks } from '../hooks/useTasks';
import { useHolidays } from '../hooks/useHolidays';
import type { Task } from '../types';
import CalendarCell from './CalendarCell';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const Calendar = () => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [search, setSearch] = useState('');
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const { days, startDate, endDate } = useCalendar(year, month);
  const { tasks, addTask, editTask, removeTask, moveTask } = useTasks(startDate, endDate, search);
  const holidays = useHolidays(year);

  // Also fetch holidays for adjacent years if the grid spans them
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
    // Sort each day's tasks by order
    map.forEach((arr) => arr.sort((a, b) => a.order - b.order));
    return map;
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const goToPrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
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

    // Determine target date and order
    let targetDate: string;
    let targetOrder: number;

    // If dropped over another task
    const overTask = tasks.find((t) => t._id === over.id);
    if (overTask) {
      targetDate = overTask.date;
      targetOrder = overTask.order;
    } else {
      // Dropped over a cell (droppable)
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
        <SearchInput
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Header>

      <WeekdayRow>
        {WEEKDAYS.map((wd) => (
          <Weekday key={wd}>{wd}</Weekday>
        ))}
      </WeekdayRow>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
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
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
`;

const NavSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const NavBtn = styled.button`
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 16px;

  &:hover {
    background: #f0f0f0;
  }
`;

const TodayBtn = styled(NavBtn)`
  font-size: 13px;
  margin-left: 8px;
`;

const MonthTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  min-width: 200px;
  text-align: center;
`;

const SearchInput = styled.input`
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  width: 240px;
  outline: none;

  &:focus {
    border-color: #4285f4;
  }
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

const DragOverlayItem = styled.div`
  padding: 4px 8px;
  background: #e8f0fe;
  border: 1px solid #4285f4;
  border-radius: 4px;
  font-size: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: grabbing;
`;
