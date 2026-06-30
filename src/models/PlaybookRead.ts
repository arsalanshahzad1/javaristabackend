import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPlaybookRead extends Document {
  playbookId: Types.ObjectId;
  userId: Types.ObjectId;
  readAt: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  readDurationSeconds?: number;
}

const PlaybookReadSchema = new Schema<IPlaybookRead>(
  {
    playbookId: { type: Schema.Types.ObjectId, ref: 'Playbook', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    readAt: { type: Date, default: Date.now },
    acknowledged: { type: Boolean, default: false },
    acknowledgedAt: { type: Date },
    readDurationSeconds: { type: Number },
  },
  { timestamps: false }
);

PlaybookReadSchema.index({ playbookId: 1, userId: 1 }, { unique: true });
PlaybookReadSchema.index({ userId: 1, acknowledgedAt: 1 });

export default mongoose.model<IPlaybookRead>('PlaybookRead', PlaybookReadSchema);
