# Architecture & Consultancy Website - Backend API

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your actual database URL and JWT secret

4. Run Prisma migrations:
```bash
npm run migrate:dev
```

5. Generate Prisma Client:
```bash
npm run prisma:generate
```

6. Start development server:
```bash
npm run dev
```

## Production Deployment (Railway)

1. Set environment variables in Railway
2. Build command: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
3. Start command: `npm start`

## API Documentation

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/register` - Register first admin (closes after first user)
- `GET /api/auth/me` - Get current user

### Projects (Public)
- `GET /api/projects` - List all published projects
- `GET /api/projects/:slug` - Get project by slug

### Projects (Admin - Protected)
- `POST /api/admin/projects` - Create project
- `PUT /api/admin/projects/:id` - Update project
- `DELETE /api/admin/projects/:id` - Delete project

### Articles (Public)
- `GET /api/articles` - List all published articles
- `GET /api/articles/:slug` - Get article by slug

### Articles (Admin)
- `POST /api/admin/articles` - Create article
- `PUT /api/admin/articles/:id` - Update article
- `DELETE /api/admin/articles/:id` - Delete article

### Team
- `GET /api/team` - List all team members
- `POST /api/admin/team` - Create team member (protected)
- `PUT /api/admin/team/:id` - Update team member (protected)
- `DELETE /api/admin/team/:id` - Delete team member (protected)

### Media
- `POST /api/admin/media/upload` - Upload files (protected)
- `GET /api/admin/media` - List all media (protected)
- `DELETE /api/admin/media/:id` - Delete media (protected)

### Settings
- `GET /api/settings` - Get site settings
- `PUT /api/admin/settings` - Update settings (protected)

### Contact
- `POST /api/contact/submit` - Submit contact form
- `GET /api/admin/contact` - List submissions (protected)
- `PUT /api/admin/contact/:id/read` - Mark as read (protected)
