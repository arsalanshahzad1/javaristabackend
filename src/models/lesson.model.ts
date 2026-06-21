import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IQuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface ILesson extends Document {
  course: Types.ObjectId;
  title: string;
  order?: number;
  contentType?: 'video' | 'text' | 'quiz';
  videoUrl?: string;
  body?: string;
  durationSeconds?: number;
  questions: IQuizQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

const QuizQuestionSchema = new Schema<IQuizQuestion>(
  {
    question: { type: String, required: true },
    options: [{ type: String }],
    correctIndex: { type: Number, required: true },
  },
  { _id: false }
);

const LessonSchema = new Schema<ILesson>(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true, trim: true },
    order: { type: Number },
    contentType: { type: String, enum: ['video', 'text', 'quiz'] },
    videoUrl: { type: String },
    body: { type: String },
    durationSeconds: { type: Number },
    questions: {
      type: [QuizQuestionSchema],
      default: [],
      validate: {
        validator: (arr: IQuizQuestion[]) => arr.length <= 20,
        message: 'A quiz can have at most 20 questions',
      },
    },
  },
  { timestamps: true }
);

const Lesson = mongoose.model<ILesson>('Lesson', LessonSchema);
export default Lesson;
