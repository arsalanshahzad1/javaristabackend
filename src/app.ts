import 'dotenv/config';
import express, { Application, Request, Response } from 'express';
import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import helmet from 'helmet';
import morgan from 'morgan';
import { errorMiddleware } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import brewMethodRoutes from './routes/brewMethod.routes';
import recipeRoutes from './routes/recipe.routes';
import brewLogRoutes from './routes/brewLog.routes';
import beanRoutes from './routes/bean.routes';
import espressoRoutes from './routes/espresso.routes';
import adminRoutes from './routes/admin.routes';
import academyRoutes from './routes/academy.routes';
import certificationRoutes from './routes/certification.routes';
import playbookRoutes from './routes/playbook.routes';
import checklistRoutes from './routes/checklist.routes';
import checklistScheduleRoutes from './routes/checklistSchedule.routes';
import performanceRoutes from './routes/performance.routes';
import communityRoutes from './routes/community.routes';
import investorRoutes from './routes/investor.routes';
import storeOpsRoutes from './routes/store-ops.routes';
import roleManualRoutes from './routes/roleManual.routes';
import metricsRoutes from './routes/metrics.routes';
import employeeProfileRoutes from './routes/employeeProfile.routes';
import uploadRoutes from './routes/upload.routes';
import storeRoutes from './routes/store.routes';
import notificationRoutes from './routes/notification.routes';
import constructionJournalRoutes from './routes/constructionJournal.routes';
import sourcingStoryRoutes from './routes/sourcingStory.routes';
import enrollmentRoutes from './routes/enrollment.routes';
import orgRoutes from './routes/org.routes';
import regionDashboardRoutes from './routes/region-dashboard.routes';
import employeeRoleRoutes from './routes/employeeRole.routes';
import favoriteRoutes from './routes/favorite.routes';
import collectionRoutes from './routes/collection.routes';
import connectDB from './config/db';
import rateLimit from 'express-rate-limit';
import { startCertificationExpiryJob } from './jobs/certificationExpiry.job';
import { startMissedChecklistJob } from './jobs/missed-checklist.job';

const app: Application = express();


app.use(helmet());

const allowedOrigins = new Set(
  [process.env.CLIENT_URL, process.env.ADMIN_URL].filter((origin): origin is string => Boolean(origin))
);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.has(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'JavaRista API running' });
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/brew-methods', brewMethodRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/brew-logs', brewLogRoutes);
app.use('/api/beans', beanRoutes);
app.use('/api/espresso', espressoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/academy', academyRoutes);
app.use('/api/certifications', certificationRoutes);
app.use('/api/playbooks', playbookRoutes);
app.use('/api/checklists', checklistRoutes);
app.use('/api/checklist-schedules', checklistScheduleRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/investor', investorRoutes);
app.use('/api/store-ops', storeOpsRoutes);
app.use('/api/role-manuals', roleManualRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/employees', employeeProfileRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/construction-journals', constructionJournalRoutes);
app.use('/api/sourcing-stories', sourcingStoryRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/org', orgRoutes);
app.use('/api/regions', regionDashboardRoutes);
app.use('/api/employee-roles', employeeRoleRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/collections', collectionRoutes);

app.use(errorMiddleware);

const PORT = process.env.PORT || 5001;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    startCertificationExpiryJob();
    startMissedChecklistJob();
  });
});

export default app;
