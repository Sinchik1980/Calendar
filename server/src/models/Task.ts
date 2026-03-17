import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  title: string;
  date: string; // YYYY-MM-DD
  order: number;
  userId: mongoose.Types.ObjectId;
  audioUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true },
    date: { type: String, required: true, index: true },
    order: { type: Number, required: true, default: 0 },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    audioUrl: { type: String },
  },
  { timestamps: true }
);

TaskSchema.index({ userId: 1, date: 1, order: 1 });

export default mongoose.model<ITask>('Task', TaskSchema);
