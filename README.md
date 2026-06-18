# JavaRista Backend API

REST API for the JavaRista coffee brewing app — handles authentication, brew methods, recipes, brew logs, bean tracking, espresso shot logging, and an admin dashboard.

---

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express 5
- **Database**: MongoDB Atlas via Mongoose 9
- **Auth**: JWT (access + refresh tokens), bcryptjs password hashing
- **Validation**: Joi
- **Security**: Helmet, CORS, express-rate-limit

---

## Installation & Running

```bash
# From inside javaristaapp/backend/
npm install

# Copy env file and fill in your values
cp .env.example .env

# Start development server (hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Seed the database
npm run seed
```

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Port the server listens on | `5000` |
| `NODE_ENV` | Environment mode | `development` |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://...` |
| `JWT_SECRET` | Secret key for signing access tokens | any long random string |
| `JWT_REFRESH_SECRET` | Secret key for signing refresh tokens | any long random string |
| `JWT_EXPIRES_IN` | Access token expiry | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | `your_cloud_name` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `123456789` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `abc123...` |
| `CLIENT_URL` | Flutter/mobile app origin for CORS | `http://localhost:3000` |
| `ADMIN_URL` | Admin dashboard origin for CORS | `http://localhost:3001` |

---

## Seed Script

Populates the database with initial data:

```bash
npm run seed
```

**What it inserts:**
- 1 admin user (`admin@javarista.com` / `Admin@123`) — only if no admin exists
- 7 brew methods (V60, AeroPress, Chemex, French Press, Moka Pot, Espresso, Kalita Wave)
- 3 featured published recipes with full step-by-step instructions

The seed script clears **only** the `BrewMethod` and `Recipe` collections before inserting. User data is never cleared.

---

## API Reference

### Health

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/health` | Server health check | No |

### Auth — rate limited to 10 requests per 15 min

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login and receive tokens | No |
| POST | `/api/auth/refresh` | Refresh access token | No |
| POST | `/api/auth/logout` | Invalidate refresh token | Yes |
| POST | `/api/auth/forgot-password` | Request password reset email | No |
| POST | `/api/auth/reset-password` | Reset password with token | No |
| GET | `/api/auth/me` | Get current user profile | Yes |

### Users

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/users/profile` | Get own profile | Yes |
| PUT | `/api/users/profile` | Update name and avatar | Yes |
| PUT | `/api/users/change-password` | Change password | Yes |
| DELETE | `/api/users/account` | Delete account and all data | Yes |

### Brew Methods

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/brew-methods` | List all active brew methods | No |
| GET | `/api/brew-methods/:id` | Get single brew method | No |
| POST | `/api/brew-methods` | Create brew method | Admin |
| PUT | `/api/brew-methods/:id` | Update brew method | Admin |
| DELETE | `/api/brew-methods/:id` | Soft-delete brew method | Admin |

### Recipes

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/recipes` | List published recipes (paginated, filterable) | No |
| GET | `/api/recipes/featured` | Get up to 5 featured recipes | No |
| GET | `/api/recipes/:id` | Get recipe with populated brew method and author | No |
| POST | `/api/recipes` | Create recipe (unpublished by default) | Yes |
| PUT | `/api/recipes/:id` | Update recipe (owner or admin) | Yes |
| DELETE | `/api/recipes/:id` | Delete recipe (owner or admin) | Yes |
| POST | `/api/recipes/:id/like` | Increment like count | Yes |
| GET | `/api/recipes/my/saved` | Saved recipes (coming soon) | Yes |

**Query params for `GET /api/recipes`:** `page`, `limit`, `brewMethod`, `difficulty`, `tags` (comma-separated), `search`

### Brew Logs

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/brew-logs` | List own brew logs (paginated) | Yes |
| GET | `/api/brew-logs/stats` | Get totalBrews, avgRating, thisMonth | Yes |
| GET | `/api/brew-logs/:id` | Get single brew log | Yes |
| POST | `/api/brew-logs` | Create brew log | Yes |
| PUT | `/api/brew-logs/:id` | Update brew log | Yes |
| DELETE | `/api/brew-logs/:id` | Delete brew log | Yes |

### Beans

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/beans` | List own beans (filter by `?status=active\|archived`) | Yes |
| GET | `/api/beans/:id` | Get single bean | Yes |
| POST | `/api/beans` | Add a bean | Yes |
| PUT | `/api/beans/:id` | Update bean | Yes |
| DELETE | `/api/beans/:id` | Delete bean | Yes |

### Espresso

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/espresso` | List own shots (paginated) | Yes |
| GET | `/api/espresso/latest` | Get most recent shot | Yes |
| POST | `/api/espresso` | Log a shot (auto-generates suggestion) | Yes |
| DELETE | `/api/espresso/:id` | Delete shot | Yes |

### Admin — requires admin role

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/admin/stats` | Platform stats + popular brew methods | Admin |
| GET | `/api/admin/users` | All users (paginated, searchable) | Admin |
| PUT | `/api/admin/users/:id` | Update user role / subscription | Admin |
| DELETE | `/api/admin/users/:id` | Delete user and all their data | Admin |
| GET | `/api/admin/recipes` | All recipes regardless of publish status | Admin |
| PUT | `/api/admin/recipes/:id/publish` | Publish / feature a recipe | Admin |
| DELETE | `/api/admin/recipes/:id` | Delete any recipe | Admin |
| GET | `/api/admin/brew-logs` | All brew logs across all users | Admin |

---

## Auth Flow

1. **Register or Login** → receive `accessToken` (15m) + `refreshToken` (7d)
2. Send `Authorization: Bearer <accessToken>` on protected routes
3. When access token expires, call `POST /api/auth/refresh` with `{ refreshToken }` to get a new access token
4. On logout, the refresh token is invalidated server-side

---

## Response Format

All responses follow this shape:

```json
// Success
{ "success": true, "message": "...", "data": {}, "pagination": {} }

// Error
{ "success": false, "message": "...", "errors": [] }
```
