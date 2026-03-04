import { Router, Request, Response } from 'express';
import Task from '../models/Task';

const router = Router();

// GET /api/tasks?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&search=text
router.get('/', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, search } = req.query;
    const filter: Record<string, unknown> = {};

    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }

    if (search && typeof search === 'string' && search.trim()) {
      filter.title = { $regex: search.trim(), $options: 'i' };
    }

    const tasks = await Task.find(filter).sort({ date: 1, order: 1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /api/tasks
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, date } = req.body;
    const maxOrder = await Task.findOne({ date }).sort({ order: -1 });
    const order = maxOrder ? maxOrder.order + 1 : 0;

    const task = await Task.create({ title, date, order });
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PUT /api/tasks/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// PUT /api/tasks/:id/reorder — move task to a new date/position
router.put('/:id/reorder', async (req: Request, res: Response) => {
  try {
    const { date, order } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const oldDate = task.date;
    const oldOrder = task.order;

    // If moving to a different date, close the gap in the old date
    if (oldDate !== date) {
      await Task.updateMany(
        { date: oldDate, order: { $gt: oldOrder } },
        { $inc: { order: -1 } }
      );
    } else {
      // Same date reorder: shift tasks between old and new positions
      if (order > oldOrder) {
        await Task.updateMany(
          { date, order: { $gt: oldOrder, $lte: order }, _id: { $ne: task._id } },
          { $inc: { order: -1 } }
        );
      } else if (order < oldOrder) {
        await Task.updateMany(
          { date, order: { $gte: order, $lt: oldOrder }, _id: { $ne: task._id } },
          { $inc: { order: 1 } }
        );
      }
    }

    // If moving to a new date, make room at the target position
    if (oldDate !== date) {
      await Task.updateMany(
        { date, order: { $gte: order } },
        { $inc: { order: 1 } }
      );
    }

    task.date = date;
    task.order = order;
    await task.save();

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to reorder task' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Close the gap
    await Task.updateMany(
      { date: task.date, order: { $gt: task.order } },
      { $inc: { order: -1 } }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
