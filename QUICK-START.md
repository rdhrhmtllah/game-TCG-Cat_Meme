# MemeCats TCG - Quick Start Guide
## Setup Development Environment dalam 5 Menit

---

## 🚀 Prerequisites

- **Node.js** 18+ atau 20+ ([Download](https://nodejs.org/))
- **npm** (included with Node.js)
- **Database** ([Neon.tech](https://neon.tech) - Free tier)

---

## ⚡ Quick Setup

### 1. **Install Dependencies**
```bash
npm install
```

### 2. **Setup Environment**
```bash
# Copy environment template
copy .env.example .env
```

### 3. **Configure .env**
Edit `.env` file:

```env
# Generate dengan: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=<paste_random_string_here>
ADMIN_SECRET=<paste_random_string_here>

# Dapatkan dari https://neon.tech
DATABASE_URL=postgresql://user:pass@host/database?sslmode=require

# Optional (untuk AI features)
GEMINI_API_KEY=your_key_from_google_ai_studio

# Optional (untuk image upload)
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token

# Static
NODE_ENV=development
CRON_SECRET=any_random_string
```

### 4. **Generate Secrets**
```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate ADMIN_SECRET  
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. **Setup Database**
```bash
# Push schema to database
npm run db:push

# Seed initial data (optional)
npm run db:seed
```

### 6. **Verify Configuration**
```bash
npm run check-env
```

Should output: `✅ All environment variables configured!`

### 7. **Start Development**
```bash
npm run dev
```

Should see:
```
[api] 🚀 Dev API server running at http://localhost:3000
[web] ➜ Local:   http://localhost:5678/
```

### 8. **Open Browser**
Navigate to: **http://localhost:5678**

---

## 🎮 First Steps

### Create Admin Account
1. Register normal account di `/register`
2. Database → manually set `role='admin'` di table `users`
3. Login dengan account tersebut
4. Access `/admin` untuk manage cards

### Or Use Seed Data
```bash
npm run db:seed
```

Default admin:
- Email: `admin@memecats.com`
- Password: `admin123`

---

## 🔧 Common Commands

```bash
# Development
npm run dev              # Start full stack (API + Web)
npm run dev:api-only     # API server only
npm run dev:web-only     # Vite only

# Environment
npm run check-env        # Verify .env configuration

# Database
npm run db:push          # Push schema changes
npm run db:seed          # Seed initial data
npm run db:migrate       # Run migrations

# Build
npm run build            # Build for production
npm run preview          # Preview production build
```

---

## 🐛 Troubleshooting

### Error: "Server tidak merespon"
**Cause**: API server not running

**Fix**:
```bash
# Check env vars
npm run check-env

# Start API manually
npm run dev:api-only

# Should see: 🚀 Dev API server running at http://localhost:3000
```

### Error: "Missing environment variables"
**Cause**: .env not configured

**Fix**:
```bash
# Verify .env exists
dir .env

# Check configuration
npm run check-env

# If missing, copy template
copy .env.example .env
```

### Error: "Port already in use"
**Cause**: Port 3000 or 5678 already occupied

**Fix**:
```bash
# Kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Kill process on port 5678
netstat -ano | findstr :5678
taskkill /PID <PID> /F
```

**Full troubleshooting**: See `docs/TROUBLESHOOTING.md`

---

## 📚 Project Structure

```
game-TCG-Cat_Meme/
├── src/                    # Frontend (Vue 3)
│   ├── views/             # Pages
│   ├── components/        # Reusable components
│   ├── stores/            # Pinia state management
│   └── assets/            # CSS, images
├── api-server/            # Backend (Node.js)
│   ├── auth/              # Authentication endpoints
│   ├── admin/             # Admin endpoints
│   ├── db/                # Database schema & migrations
│   └── _lib/              # Shared utilities
├── docs/                  # Documentation
└── .env                   # Environment variables
```

---

## 🎯 Next Steps

1. ✅ Setup complete
2. 📖 Read `docs/UI-DESIGN-SYSTEM.md` for UI guidelines
3. 🎨 Read `docs/ACTIVITY-HUB-IMPROVEMENTS.md` for new features
4. 🐛 Check `docs/TROUBLESHOOTING.md` if issues occur
5. 🚀 Start building!

---

## 💡 Tips

### Hot Reload
- Frontend: Auto reload on file save
- Backend: Auto restart on `.js` file save

### Database Browser
Use any PostgreSQL client:
- **TablePlus** (Recommended)
- **pgAdmin**
- **DBeaver**

Connect using `DATABASE_URL` from `.env`

### API Testing
Use any HTTP client:
- **Thunder Client** (VS Code extension)
- **Postman**
- **Insomnia**

API runs at: `http://localhost:3000/api/`

---

## ✨ Features

- 🎴 Card Collection & Trading
- 🎰 Fortune Wheel & Mini Games
- 🎯 Daily Missions & Achievements
- ⚗️ Card Fusion System
- 🏪 Marketplace
- 👑 Admin Panel
- 🤖 AI-powered card generation (with Gemini API)

---

**Selamat Coding!** 🚀
