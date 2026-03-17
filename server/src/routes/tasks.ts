import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import Task from '../models/Task';
import { auth, AuthRequest } from '../middleware/auth';

const uploadsDir = path.join(__dirname, '../../../uploads/audio');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, _file, cb) => cb(null, `${uuidv4()}.webm`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

// All routes require auth
router.use(auth);

// GET /api/tasks?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&search=text
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, search } = req.query;
    const filter: Record<string, unknown> = { userId: req.userId };

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
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { title, date } = req.body;
    const maxOrder = await Task.findOne({ date, userId: req.userId }).sort({ order: -1 });
    const order = maxOrder ? maxOrder.order + 1 : 0;

    const task = await Task.create({ title, date, order, userId: req.userId });
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PUT /api/tasks/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true }
    );
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// PUT /api/tasks/:id/reorder
router.put('/:id/reorder', async (req: AuthRequest, res: Response) => {
  try {
    const { date, order } = req.body;
    const task = await Task.findOne({ _id: req.params.id, userId: req.userId });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const oldDate = task.date;
    const oldOrder = task.order;
    const userFilter = { userId: req.userId };

    if (oldDate !== date) {
      await Task.updateMany(
        { ...userFilter, date: oldDate, order: { $gt: oldOrder } },
        { $inc: { order: -1 } }
      );
    } else {
      if (order > oldOrder) {
        await Task.updateMany(
          { ...userFilter, date, order: { $gt: oldOrder, $lte: order }, _id: { $ne: task._id } },
          { $inc: { order: -1 } }
        );
      } else if (order < oldOrder) {
        await Task.updateMany(
          { ...userFilter, date, order: { $gte: order, $lt: oldOrder }, _id: { $ne: task._id } },
          { $inc: { order: 1 } }
        );
      }
    }

    if (oldDate !== date) {
      await Task.updateMany(
        { ...userFilter, date, order: { $gte: order } },
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
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (task.audioUrl) {
      const filename = path.basename(task.audioUrl);
      const filePath = path.join(uploadsDir, filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await Task.updateMany(
      { userId: req.userId, date: task.date, order: { $gt: task.order } },
      { $inc: { order: -1 } }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// POST /api/tasks/:id/audio
router.post('/:id/audio', upload.single('audio'), async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.userId });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Delete old audio if exists
    if (task.audioUrl) {
      const oldFile = path.join(uploadsDir, path.basename(task.audioUrl));
      if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
    }

    const audioUrl = `/uploads/audio/${req.file.filename}`;
    task.audioUrl = audioUrl;
    await task.save();

    res.json({ audioUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload audio' });
  }
});

// DELETE /api/tasks/:id/audio
router.delete('/:id/audio', async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.userId });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (task.audioUrl) {
      const filePath = path.join(uploadsDir, path.basename(task.audioUrl));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      task.audioUrl = undefined;
      await task.save();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete audio' });
  }
});

export default router;
