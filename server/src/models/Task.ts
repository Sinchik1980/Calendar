import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  title: string;
  date: string; // YYYY-MM-DD
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true },
    date: { type: String, required: true, index: true },
    order: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

TaskSchema.index({ date: 1, order: 1 });

export default mongoose.model<ITask>('Task', TaskSchema);
