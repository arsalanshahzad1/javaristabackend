import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorMiddleware } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import brewMethodRoutes from './routes/brewMethod.routes';
import recipeRoutes from './routes/recipe.routes';
import brewLogRoutes from './routes/brewLog.routes';
import beanRoutes from './routes/bean.routes';
import espressoRoutes from './routes/espresso.routes';
import adminRoutes from './routes/admin.routes';
import connectDB from './config/db';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app: Application = express();

app.use(helmet());
app.use(cors({ origin: [process.env.CLIENT_URL || '', process.env.ADMIN_URL || ''], credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'JavaRista API running' });
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many requests, please try again later' },
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/brew-methods', brewMethodRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/brew-logs', brewLogRoutes);
app.use('/api/beans', beanRoutes);
app.use('/api/espresso', espressoRoutes);
app.use('/api/admin', adminRoutes);

app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
});

export default app;
