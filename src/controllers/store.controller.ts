import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/response';
import Store from '../models/Store';
import User from '../models/User';

// GET /api/stores
export const getAllStores = asyncHandler(async (req: Request, res: Response) => {
  const stores = await Store.find({ isActive: true })
    .populate('managerId', 'name email')
    .sort({ storeNumber: 1 })
    .select('-__v');

  const storeNumbers = stores.map((s) => s.storeNumber);
  const employeeCounts = await User.aggregate<{ _id: string; count: number }>([
    { $match: { storeId: { $in: storeNumbers } } },
    { $group: { _id: '$storeId', count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(employeeCounts.map((e) => [e._id, e.count]));

  const result = stores.map((s) => ({
    ...s.toObject(),
    employeeCount: countMap[s.storeNumber] ?? 0,
  }));

  successResponse(res, 'Stores fetched', result);
});

// GET /api/stores/:id
export const getStoreById = asyncHandler(async (req: Request, res: Response) => {
  const store = await Store.findById(req.params['id']).populate('managerId', 'name email');
  if (!store) {
    errorResponse(res, 'Store not found', 404);
    return;
  }
  const employeeCount = await User.countDocuments({ storeId: store.storeNumber });
  successResponse(res, 'Store fetched', { ...store.toObject(), employeeCount });
});

// POST /api/stores
export const createStore = asyncHandler(async (req: Request, res: Response) => {
  const store = await Store.create({ ...req.body, createdBy: req.user!.userId });
  successResponse(res, 'Store created', store, 201);
});

// PUT /api/stores/:id
export const updateStore = asyncHandler(async (req: Request, res: Response) => {
  const store = await Store.findByIdAndUpdate(req.params['id'], req.body, {
    new: true,
    runValidators: true,
  }).populate('managerId', 'name email');
  if (!store) {
    errorResponse(res, 'Store not found', 404);
    return;
  }
  successResponse(res, 'Store updated', store);
});

// DELETE /api/stores/:id  (soft delete)
export const deleteStore = asyncHandler(async (req: Request, res: Response) => {
  const store = await Store.findByIdAndUpdate(
    req.params['id'],
    { isActive: false },
    { new: true }
  );
  if (!store) {
    errorResponse(res, 'Store not found', 404);
    return;
  }
  successResponse(res, 'Store deactivated', store);
});

// POST /api/stores/:id/photos
export const addStorePhoto = asyncHandler(async (req: Request, res: Response) => {
  const store = await Store.findById(req.params['id']);
  if (!store) {
    errorResponse(res, 'Store not found', 404);
    return;
  }
  const file = req.file as (Express.Multer.File & { path?: string }) | undefined;
  const photoUrl = file?.path;
  if (!photoUrl) {
    errorResponse(res, 'No photo provided', 400);
    return;
  }
  store.photos.push(photoUrl);
  await store.save();
  successResponse(res, 'Photo added', store);
});

// DELETE /api/stores/:id/photos
export const removeStorePhoto = asyncHandler(async (req: Request, res: Response) => {
  const store = await Store.findById(req.params['id']);
  if (!store) {
    errorResponse(res, 'Store not found', 404);
    return;
  }
  const { photoUrl } = req.body as { photoUrl: string };
  store.photos = store.photos.filter((p) => p !== photoUrl);
  if (store.coverPhoto === photoUrl) store.coverPhoto = undefined;
  await store.save();
  successResponse(res, 'Photo removed', store);
});

// POST /api/stores/migrate-users  (owner only)
export const migrateUsersToStores = asyncHandler(async (req: Request, res: Response) => {
  if (req.user?.role !== 'owner') {
    errorResponse(res, 'Owner access required', 403);
    return;
  }

  const usersWithStore = await User.find({
    storeId: { $exists: true, $ne: '' },
  }).select('storeId');

  const uniqueStoreIds = [
    ...new Set(
      usersWithStore
        .map((u) => (u as unknown as { storeId?: string }).storeId)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  let created = 0;
  for (const storeId of uniqueStoreIds) {
    const existing = await Store.findOne({ storeNumber: storeId });
    if (!existing) {
      await Store.create({
        name: `Store ${storeId}`,
        storeNumber: storeId,
        address: { street: '', city: '', state: '', country: '' },
        status: 'open',
        isActive: true,
        createdBy: req.user!.userId,
      });
      created++;
    }
  }

  successResponse(res, 'Migration complete', { created, checked: uniqueStoreIds.length });
});
