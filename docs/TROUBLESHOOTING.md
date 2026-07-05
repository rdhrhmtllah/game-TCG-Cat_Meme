# Troubleshooting Guide
## Mengatasi Error Umum di MemeCats

---

## ❌ Error: "Server tidak merespon"

### Gejala:
```
⚠️ Server tidak merespon. Coba lagi nanti.
[vite] http proxy error: /api/auth/login
```

### Penyebab:
API server (backend) tidak running atau crash.

### Solusi:

#### 1. **Check Environment Variables**
```bash
npm run check-env
```

Pastikan output: `✅ All environment variables configured!`

#### 2. **Check .env File**
Pastikan file `.env` ada dan terisi:
```bash
# Buka .env dan pastikan semua nilai sudah diisi
JWT_SECRET=your_jwt_secret_here_min_32_chars
ADMIN_SECRET=your_admin_secret_here
DATABASE_URL=postgresql://user:pass@host/database
GEMINI_API_KEY=your_gemini_key (opsional)
BLOB_READ_WRITE_TOKEN=your_blob_token (opsional)
```

#### 3. **Generate Secrets**
Untuk JWT_SECRET dan ADMIN_SECRET, gunakan random string:
```bash
# Di terminal
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 4. **Start API Server Manually**
Test API server secara terpisah:
```bash
npm run dev:api-only
```

Pastikan output: `🚀 Dev API server running at http://localhost:3000`

#### 5. **Test API Endpoint**
Di browser atau curl, test:
```bash
curl http://localhost:3000/api/health
```

Jika error, check log di terminal.

#### 6. **Start Full Development**
Setelah API server running:
```bash
npm run dev
```

---

## 🔧 Error: "Missing required environment variables"

### Gejala:
```
❌ Missing required environment variables: JWT_SECRET, DATABASE_URL
```

### Solusi:

1. **Copy .env.example**
```bash
copy .env.example .env
```

2. **Edit .env**
Buka `.env` dan isi semua nilai:
- `JWT_SECRET`: Random string 32+ karakter
- `ADMIN_SECRET`: Random string 32+ karakter  
- `DATABASE_URL`: PostgreSQL connection string
- `GEMINI_API_KEY`: (Optional) Google Gemini API key
- `BLOB_READ_WRITE_TOKEN`: (Optional) Vercel Blob token

3. **Verify**
```bash
npm run check-env
```

---

## 🗄️ Error: Database Connection

### Gejala:
```
Error: connect ECONNREFUSED
Error: password authentication failed
```

### Solusi:

1. **Check DATABASE_URL Format**
```
postgresql://username:password@host:port/database?sslmode=require
```

2. **Neon Database** (Recommended)
- Sign up: https://neon.tech
- Create new project
- Copy connection string
- Paste ke DATABASE_URL di .env

3. **Test Connection**
```bash
npm run db:push
```

---

## 🚀 Error: Port Already in Use

### Gejala:
```
Error: listen EADDRINUSE: address already in use :::3000
Error: listen EADDRINUSE: address already in use :::5678
```

### Solusi:

#### Windows:
```bash
# Find and kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Find and kill process on port 5678
netstat -ano | findstr :5678
taskkill /PID <PID> /F
```

#### Atau ubah port di `.env`:
```
PORT=3001
```

Dan di `vite.config.js`:
```javascript
server: {
  port: 5679, // ubah dari 5678
  // ...
}
```

---

## 📦 Error: Module not found

### Gejala:
```
Error: Cannot find module 'xxx'
Error [ERR_MODULE_NOT_FOUND]
```

### Solusi:

1. **Reinstall Dependencies**
```bash
rm -rf node_modules package-lock.json
npm install
```

2. **Check Node Version**
```bash
node --version  # Should be 18+ or 20+
```

3. **Update npm**
```bash
npm install -g npm@latest
```

---

## 🔐 Error: JWT/Authentication Issues

### Gejala:
```
Error: invalid token
Error: jwt malformed
Error: jwt expired
```

### Solusi:

1. **Clear Browser Storage**
- Open DevTools (F12)
- Application → Local Storage → Clear All
- Refresh page

2. **Re-generate JWT_SECRET**
```bash
# Generate new secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

3. **Update .env**
```
JWT_SECRET=<new_secret_here>
```

4. **Restart Server**
```bash
npm run dev
```

---

## 🎨 Error: CSS/Styling tidak muncul

### Gejala:
- Halaman terlihat broken
- Glass effects tidak tampil
- Warna tidak sesuai

### Solusi:

1. **Check Import Order**
Pastikan di `main.css`:
```css
@import './tokens.css';
@tailwind base;
@tailwind components;
@tailwind utilities;
```

2. **Rebuild Tailwind**
```bash
# Stop dev server (Ctrl+C)
# Delete cache
rm -rf node_modules/.vite
# Restart
npm run dev
```

3. **Check Browser Console**
- F12 → Console
- Look for CSS loading errors
- Check Network tab for 404 errors

---

## 🐛 General Debugging Steps

### 1. Check All Logs
```bash
# Terminal 1: API Server logs
npm run dev:api-only

# Terminal 2: Vite logs  
npm run dev:web-only
```

### 2. Check Browser Console
- F12 → Console
- Look for errors (red)
- Check Network tab for failed requests

### 3. Check Environment
```bash
npm run check-env
```

### 4. Verify Database
```bash
npm run db:push
```

### 5. Clean Install
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

## 📞 Still Having Issues?

### Debug Checklist:
- [ ] .env file exists and filled
- [ ] All env vars configured (check-env passes)
- [ ] Node version 18+ or 20+
- [ ] Database connection working
- [ ] API server running on port 3000
- [ ] Vite running on port 5678
- [ ] No port conflicts
- [ ] Browser console has no errors
- [ ] Network tab shows successful API calls

### Get Help:
1. Check existing issues in GitHub
2. Review logs carefully
3. Include error messages when asking
4. Provide environment info (OS, Node version)

---

## 🛠️ Development Tips

### Quick Commands:
```bash
# Check env
npm run check-env

# Start full dev
npm run dev

# API only
npm run dev:api-only

# Web only
npm run dev:web-only

# Reset database
npm run db:push

# Seed data
npm run db:seed
```

### Useful Aliases:
Add to `.bashrc` or `.zshrc`:
```bash
alias meme-dev='cd ~/path/to/game-TCG-Cat_Meme && npm run dev'
alias meme-check='cd ~/path/to/game-TCG-Cat_Meme && npm run check-env'
alias meme-reset='cd ~/path/to/game-TCG-Cat_Meme && npm run db:push && npm run db:seed'
```

---

**Happy Coding!** 🚀
