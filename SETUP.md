# 🚀 WALLET SERVICE SETUP GUIDE

## Step-by-Step Setup Instructions

### 📋 Prerequisites Checklist
- [ ] Node.js v18 or higher installed
- [ ] PostgreSQL database running
- [ ] Google Cloud account (for OAuth)
- [ ] Paystack account

---

## 1️⃣ DATABASE SETUP

### Option A: Local PostgreSQL (Recommended for Development)

**Using Docker (Easiest):**
```powershell
docker run --name wallet-db -e POSTGRES_PASSWORD=mypassword -p 5432:5432 -d postgres
```

**Or Install PostgreSQL Manually:**
1. Download from: https://www.postgresql.org/download/windows/
2. Install and set password during setup
3. PostgreSQL runs on `localhost:5432` by default

**Create Database:**
```powershell
# Access PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE wallet_service;

# Exit
\q
```

Your DATABASE_URL will be:
```
DATABASE_URL="postgresql://postgres:mypassword@localhost:5432/wallet_service"
```

---

## 2️⃣ GOOGLE OAUTH SETUP

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create New Project**
   - Click "Select a project" → "New Project"
   - Name: "Wallet Service" (or any name)
   - Click "Create"

3. **Enable Google+ API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. **Create OAuth Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "Wallet Service OAuth"
   
   **Authorized redirect URIs** - ADD BOTH:
   ```
   http://localhost:3000/auth/google/callback
   https://yourdomain.com/auth/google/callback
   ```

5. **Copy Credentials**
   - Client ID: `xxxxx.apps.googleusercontent.com`
   - Client Secret: `GOCSPX-xxxxx`

---

## 3️⃣ PAYSTACK SETUP

1. **Sign up at Paystack**
   - Visit: https://paystack.com/
   - Create account and verify email

2. **Get API Keys**
   - Dashboard → Settings → API Keys & Webhooks
   - Copy:
     - **Secret Key** (starts with `sk_test_` or `sk_live_`)
     - **Public Key** (starts with `pk_test_` or `pk_live_`)

3. **Setup Webhook** (Important!)
   
   **For Local Development (use ngrok):**
   ```powershell
   # Install ngrok: https://ngrok.com/download
   ngrok http 3000
   ```
   
   Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
   
   **In Paystack Dashboard:**
   - Go to Settings → API Keys & Webhooks
   - Add webhook URL: `https://abc123.ngrok.io/wallet/paystack/webhook`
   - Click "Save"

---

## 4️⃣ PROJECT SETUP

### Install Dependencies
```powershell
cd c:\Users\DELL\Desktop\HNG\stage-8-9
npm install
```

### Configure Environment Variables
```powershell
# Copy example env file
copy .env.example .env

# Open .env in notepad
notepad .env
```

**Fill in your .env file:**
```env
# Database
DATABASE_URL="postgresql://postgres:mypassword@localhost:5432/wallet_service"

# JWT (Generate random secret)
JWT_SECRET="use-node-crypto-to-generate-this-see-below"
JWT_EXPIRES_IN="7d"

# Google OAuth (from Step 2)
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/auth/google/callback"

# Paystack (from Step 3)
PAYSTACK_SECRET_KEY="sk_test_your_key"
PAYSTACK_PUBLIC_KEY="pk_test_your_key"

# Server
PORT=3000
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"
```

**Generate JWT_SECRET:**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output and paste as JWT_SECRET.

### Run Database Migrations
```powershell
npx prisma migrate dev --name init
```

This creates all database tables.

### Generate Prisma Client
```powershell
npx prisma generate
```

---

## 5️⃣ START THE SERVER

### Development Mode (with hot reload)
```powershell
npm run dev
```

### Production Mode
```powershell
npm run build
npm start
```

**Server should start on:** `http://localhost:3000`

You should see:
```
✅ Database connected successfully
🚀 Server running on port 3000
📝 Environment: development
```

---

## 6️⃣ TESTING THE API

### Test 1: Health Check
```powershell
curl http://localhost:3000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Wallet Service API is running"
}
```

### Test 2: Google Login
1. Open browser: `http://localhost:3000/auth/google`
2. Sign in with Google
3. You'll receive a JWT token response

### Test 3: Create API Key
```powershell
# Replace YOUR_JWT_TOKEN with token from Test 2
curl -X POST http://localhost:3000/keys/create `
  -H "Authorization: Bearer YOUR_JWT_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{\"name\":\"test-key\",\"permissions\":[\"read\",\"deposit\"],\"expiry\":\"1D\"}'
```

Save the returned `api_key` value!

### Test 4: Get Balance (using API key)
```powershell
curl -H "x-api-key: YOUR_API_KEY" http://localhost:3000/wallet/balance
```

### Test 5: Deposit Funds
```powershell
curl -X POST http://localhost:3000/wallet/deposit `
  -H "x-api-key: YOUR_API_KEY" `
  -H "Content-Type: application/json" `
  -d '{\"amount\":5000}'
```

You'll get a Paystack payment link. Complete payment there.

---

## 7️⃣ VIEW DATABASE

```powershell
npx prisma studio
```

Opens database viewer at `http://localhost:5555`

---

## 🔧 TROUBLESHOOTING

### Error: "Cannot connect to database"
✅ **Solution:**
- Verify PostgreSQL is running: `pg_ctl status`
- Check DATABASE_URL in .env
- Test connection: `psql -U postgres -d wallet_service`

### Error: "Invalid Google credentials"
✅ **Solution:**
- Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env
- Check authorized redirect URIs in Google Console match exactly
- Make sure you enabled Google+ API

### Error: "Paystack webhook not working"
✅ **Solution:**
- For local dev, use ngrok: `ngrok http 3000`
- Update webhook URL in Paystack dashboard with ngrok HTTPS URL
- Check Paystack dashboard → Webhook Logs for errors
- Verify PAYSTACK_SECRET_KEY is correct

### Error: "API key invalid"
✅ **Solution:**
- API keys are shown only once during creation
- Create a new key if you lost it
- Check you're using `x-api-key` header (not `api-key` or `apikey`)

### Error: "Module not found" or TypeScript errors
✅ **Solution:**
```powershell
# Delete node_modules and reinstall
Remove-Item -Recurse -Force node_modules
npm install

# Regenerate Prisma client
npx prisma generate

# Rebuild
npm run build
```

---

## 📊 PROJECT STRUCTURE

```
stage-8-9/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Migration files
├── src/
│   ├── config/
│   │   ├── database.ts        # Prisma client
│   │   ├── env.ts             # Environment config
│   │   └── passport.ts        # Google OAuth setup
│   ├── controllers/
│   │   ├── authController.ts  # Login handlers
│   │   ├── apiKeyController.ts # API key management
│   │   └── walletController.ts # Wallet operations
│   ├── middlwware/
│   │   └── auth.ts            # JWT & API key verification
│   ├── routes/
│   │   ├── auth.ts            # Auth routes
│   │   ├── apiKeys.ts         # API key routes
│   │   ├── wallet.ts          # Wallet routes
│   │   └── index.ts           # Route aggregator
│   ├── services/
│   │   └── paystack.ts        # Paystack integration
│   ├── utils/
│   │   ├── apiKey.ts          # API key helpers
│   │   ├── jwt.ts             # JWT helpers
│   │   └── wallet.ts          # Wallet helpers
│   ├── types/
│   │   └── express.d.ts       # TypeScript types
│   ├── app.ts                 # Express app setup
│   └── server.ts              # Server entry point
├── .env                       # Environment variables
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🎯 QUICK START (For Impatient Developers)

```powershell
# 1. Install dependencies
npm install

# 2. Setup .env (see section 4)
copy .env.example .env
notepad .env

# 3. Setup database
npx prisma migrate dev --name init

# 4. Start server
npm run dev

# 5. Test login
# Open: http://localhost:3000/auth/google
```

---

## 📚 API DOCUMENTATION

Full API docs in README.md including:
- All endpoints
- Request/response formats
- Authentication methods
- Permission requirements
- Error codes

---

## 🔒 SECURITY REMINDERS

✅ **NEVER commit .env file to git**
✅ **Use strong JWT_SECRET in production**
✅ **Always use HTTPS in production**
✅ **Rotate API keys regularly**
✅ **Monitor Paystack webhook logs**
✅ **Set rate limiting in production**

---

## 📝 NEXT STEPS AFTER SETUP

1. ✅ Test all endpoints with Postman/Thunder Client
2. ✅ Deploy to production (Render, Railway, Heroku)
3. ✅ Setup monitoring (Sentry for errors)
4. ✅ Add rate limiting middleware
5. ✅ Setup automated backups for database
6. ✅ Create frontend application

---

## 🆘 NEED HELP?

- Check logs: `npm run dev` (shows detailed errors)
- View database: `npx prisma studio`
- Check Paystack webhook logs in dashboard
- Review task requirements document

---

## ✅ SUBMISSION CHECKLIST

Before submitting Stage 9:

- [ ] All endpoints working
- [ ] Google OAuth login functional
- [ ] Paystack deposits working
- [ ] Webhook crediting wallets correctly
- [ ] API key system working (create, rollover, permissions)
- [ ] Max 5 API keys enforced
- [ ] Wallet transfers working
- [ ] Transaction history showing correctly
- [ ] All security measures implemented
- [ ] Code well-commented
- [ ] README.md complete
- [ ] .env.example provided
- [ ] Tested end-to-end

Good luck! 🚀
