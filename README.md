# Wallet Service API - Stage 8

A secure wallet service with Paystack integration, JWT authentication, and API key management.

## 🎯 Features

- ✅ Google OAuth authentication with JWT
- ✅ Wallet creation per user with unique wallet numbers
- ✅ Paystack deposit integration with webhook handling
- ✅ Wallet-to-wallet transfers
- ✅ API key system with permissions (deposit, transfer, read)
- ✅ Maximum 5 active API keys per user
- ✅ API key expiration and rollover
- ✅ Transaction history
- ✅ Secure API key storage (bcrypt hashing)
- ✅ Paystack webhook signature verification
- ✅ **Swagger API Documentation**

## 📚 API Documentation

**Swagger UI:** `/api-docs`

Access interactive API documentation at:
- **Production:** `https://hng-stage-8-9-production.up.railway.app/api-docs`
- **Local:** `http://localhost:3000/api-docs`

The Swagger documentation includes:
- All API endpoints with request/response examples
- JWT Bearer authentication
- API Key authentication (x-api-key header)
- Try-it-out functionality

---

## 🎯 How to Test the API

### Using Swagger UI (Recommended)

This is the **easiest way** to test all endpoints without writing any code!

#### Step 1: Access Swagger
Visit: `https://hng-stage-8-9-production.up.railway.app/api-docs`

#### Step 2: Authenticate with Google
1. In your browser, visit: `https://hng-stage-8-9-production.up.railway.app/auth/google`
2. Sign in with your Google account
3. You'll be redirected with a JWT token in the URL
4. **Copy the token** from the response (it looks like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

#### Step 3: Authorize in Swagger
1. Go back to Swagger UI
2. Click the **"Authorize"** button (🔒 lock icon at the top right)
3. In the **bearerAuth** field, paste your JWT token
4. Click **"Authorize"** then **"Close"**
5. You're now authenticated! ✅

#### Step 4: Create an API Key (Optional)
1. Scroll to **"API Keys"** section in Swagger
2. Click on **POST /keys/create**
3. Click **"Try it out"**
4. Edit the request body:
```json
{
  "name": "My Test Key",
  "permissions": ["deposit", "transfer", "read"],
  "expiry": "1M"
}
```
5. Click **"Execute"**
6. **Save the API key** from the response - you won't see it again!

#### Step 5: Test Wallet Deposit
1. Scroll to **"Wallet"** section
2. Click on **POST /wallet/deposit**
3. Click **"Try it out"**
4. Enter amount in Naira:
```json
{
  "amount": 5000
}
```
5. Click **"Execute"**
6. Copy the `authorization_url` from the response
7. Open it in a new tab to complete payment on Paystack
8. After payment, your wallet is **automatically credited** via webhook

#### Step 6: Check Your Balance
1. In Swagger, click **GET /wallet/balance**
2. Click **"Try it out"** → **"Execute"**
3. See your balance and wallet number!

#### Step 7: Transfer Funds
1. Click **POST /wallet/transfer**
2. Click **"Try it out"**
3. Enter recipient's wallet number and amount:
```json
{
  "wallet_number": "1234567890123",
  "amount": 1000
}
```
4. Click **"Execute"**
5. Transfer complete! ✅

#### Step 8: View Transaction History
1. Click **GET /wallet/transactions**
2. Click **"Try it out"** → **"Execute"**
3. See all your deposits and transfers with timestamps

#### Using API Key Authentication (Alternative)

After creating an API key:
1. Click the **"Authorize"** button again
2. In the **apiKeyAuth** field, paste your API key (e.g., `sk_live_1234567890abcdef`)
3. Click **"Authorize"** then **"Close"**
4. Now you can use the API key instead of JWT for wallet operations

**Note:** API key authentication only works for **wallet endpoints**, not for managing API keys themselves.

---

## 🚀 Getting Started (Local Development)

### Prerequisites

- Node.js (v18+)
- PostgreSQL database
- Google OAuth credentials
- Paystack account

### Installation

1. **Clone and install dependencies**
```bash
cd stage-8-9
npm install
```

2. **Setup environment variables**
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT signing
- `GOOGLE_CLIENT_ID` - From Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- `PAYSTACK_SECRET_KEY` - From Paystack Dashboard

3. **Setup database**
```bash
npx prisma migrate dev --name init
```

4. **Start development server**
```bash
npm run dev
```

Server will run on `http://localhost:3000`

## 📋 API Endpoints

### Authentication

#### Google OAuth Login
```
GET /auth/google
```
Redirects to Google sign-in page.

#### Google OAuth Callback
```
GET /auth/google/callback
```
Handles Google callback and returns JWT token.

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

### API Key Management

All API key endpoints require JWT authentication.

#### Create API Key
```
POST /keys/create
Authorization: Bearer <jwt_token>
```

**Request:**
```json
{
  "name": "wallet-service",
  "permissions": ["deposit", "transfer", "read"],
  "expiry": "1M"
}
```

**Valid expiry formats:** `1H`, `1D`, `1M`, `1Y` (Hour, Day, Month, Year)

**Response:**
```json
{
  "success": true,
  "data": {
    "api_key": "sk_live_xxxxx",
    "expires_at": "2025-01-09T12:00:00Z"
  }
}
```

⚠️ **Save the API key immediately - it won't be shown again!**

#### Rollover Expired Key
```
POST /keys/rollover
Authorization: Bearer <jwt_token>
```

**Request:**
```json
{
  "expired_key_id": "key_id",
  "expiry": "1M"
}
```

#### List API Keys
```
GET /keys/list
Authorization: Bearer <jwt_token>
```

#### Revoke API Key
```
DELETE /keys/:id/revoke
Authorization: Bearer <jwt_token>
```

### Wallet Operations

Wallet endpoints accept **either** JWT or API Key authentication:
- JWT: `Authorization: Bearer <token>`
- API Key: `x-api-key: <key>`

#### Deposit Funds
```
POST /wallet/deposit
Authorization: Bearer <jwt_token>
OR
x-api-key: <api_key>
```

**Requires permission:** `deposit`

**Request:**
```json
{
  "amount": 5000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reference": "TXN_1234567890_abcdef",
    "authorization_url": "https://checkout.paystack.com/..."
  }
}
```

User completes payment on Paystack. Webhook automatically credits wallet.

#### Paystack Webhook
```
POST /wallet/paystack/webhook
```

⚠️ **Internal endpoint** - Called by Paystack only. Verifies signature and credits wallet.

#### Check Deposit Status
```
GET /wallet/deposit/:reference/status
Authorization: Bearer <jwt_token>
OR
x-api-key: <api_key>
```

**Requires permission:** `read`

#### Get Balance
```
GET /wallet/balance
Authorization: Bearer <jwt_token>
OR
x-api-key: <api_key>
```

**Requires permission:** `read`

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 15000,
    "wallet_number": "4566678954356"
  }
}
```

#### Transfer Funds
```
POST /wallet/transfer
Authorization: Bearer <jwt_token>
OR
x-api-key: <api_key>
```

**Requires permission:** `transfer`

**Request:**
```json
{
  "wallet_number": "4566678954356",
  "amount": 3000
}
```

**Response:**
```json
{
  "success": true,
  "status": "success",
  "message": "Transfer completed"
}
```

#### Transaction History
```
GET /wallet/transactions
Authorization: Bearer <jwt_token>
OR
x-api-key: <api_key>
```

**Requires permission:** `read`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "deposit",
      "amount": 5000,
      "status": "success"
    },
    {
      "type": "transfer",
      "amount": -3000,
      "status": "success"
    }
  ]
}
```

## 🔒 Security Features

1. **API Key Hashing**: Keys are hashed with bcrypt before storage
2. **Webhook Verification**: Paystack signatures validated to prevent fraud
3. **JWT Expiration**: Tokens expire after 7 days (configurable)
4. **Permission System**: API keys have granular permissions
5. **Transaction Atomicity**: Transfers use database transactions
6. **Idempotency**: Webhooks won't double-credit wallets

## 🗄️ Database Schema

- **Users**: Google OAuth users
- **Wallets**: One per user with unique 13-digit wallet number
- **Transactions**: All deposits and transfers
- **ApiKeys**: Service-to-service authentication keys

## 📦 Project Structure

```
src/
├── config/          # Database, environment, Passport config
├── controllers/     # Request handlers
├── middleware/      # Authentication & authorization
├── models/          # (Prisma schema in prisma/)
├── routes/          # API routes
├── services/        # External services (Paystack)
├── utils/           # Helper functions
├── app.ts           # Express app setup
└── server.ts        # Server entry point
```

## 🔑 Authentication Methods

### JWT Authentication (User Access)
- **Use for:** Managing API keys, all wallet operations
- **How to get:** Sign in via Google OAuth at `/auth/google`
- **Header:** `Authorization: Bearer <token>`
- **Expires:** 7 days

### API Key Authentication (Service Access)
- **Use for:** Wallet operations only (deposit, transfer, balance, transactions)
- **How to get:** Create via `/keys/create` endpoint with JWT
- **Header:** `x-api-key: <key>`
- **Expires:** Based on your chosen duration (1H, 1D, 1M, 1Y)
- **Permissions:** Granular control (deposit, transfer, read)

### Which Authentication to Use?

| Endpoint | JWT | API Key | Notes |
|----------|-----|---------|-------|
| `/auth/google` | ❌ | ❌ | Public - starts OAuth flow |
| `/auth/google/callback` | ❌ | ❌ | Public - returns JWT |
| `/keys/create` | ✅ | ❌ | JWT only |
| `/keys/list` | ✅ | ❌ | JWT only |
| `/keys/rollover` | ✅ | ❌ | JWT only |
| `/keys/:id/revoke` | ✅ | ❌ | JWT only |
| `/wallet/deposit` | ✅ | ✅ | Either works (needs `deposit` permission) |
| `/wallet/balance` | ✅ | ✅ | Either works (needs `read` permission) |
| `/wallet/transfer` | ✅ | ✅ | Either works (needs `transfer` permission) |
| `/wallet/transactions` | ✅ | ✅ | Either works (needs `read` permission) |
| `/wallet/paystack/webhook` | ❌ | ❌ | Paystack only - signature verified |

## 🔧 Development

**Run migrations:**
```bash
npx prisma migrate dev
```

**View database:**
```bash
npx prisma studio
```

**Build for production:**
```bash
npm run build
npm start
```

## ⚠️ Important Notes

### Amounts & Kobo Handling
- **All amounts in the API are in Naira** (e.g., 5000 = ₦5,000)
- Internally, amounts are converted to **kobo** for Paystack (multiply by 100)
- Webhooks convert back to Naira (divide by 100)
- Minimum deposit: **₦100**
- Minimum transfer: **₦1**

### API Keys
- **Shown only once** during creation - save immediately!
- Maximum **5 active keys** per user
- Can be revoked anytime via `/keys/:id/revoke`
- Expired keys can be rolled over via `/keys/rollover`
- Each key has specific **permissions** (deposit, transfer, read)

### Wallet Operations
- Each user gets **one wallet** automatically on sign-up
- Wallet numbers are **10 digits** and unique
- Deposits require **Paystack payment** - no manual crediting
- Transfers are **atomic** - either both debit and credit succeed, or neither
- **Webhook handles crediting** - don't verify manually

### Webhooks
- Configure in Paystack Dashboard: `https://hng-stage-8-9-production.up.railway.app/wallet/paystack/webhook`
- Signature is **automatically verified** (HMAC SHA512)
- Only `charge.success` events credit wallets
- Duplicate events are **ignored** (idempotent)

### Permissions System
- `deposit` - Can initiate Paystack deposits
- `transfer` - Can transfer funds to other wallets
- `read` - Can view balance and transaction history
- API keys can have **any combination** of these permissions

## 🚨 Troubleshooting

**Database connection error:**
- Verify DATABASE_URL is correct
- Ensure PostgreSQL is running
- Run `npx prisma migrate dev`

**Google OAuth fails:**
- Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
- Verify callback URL matches Google Console

**Webhook not working:**
- Ensure webhook URL is publicly accessible (use ngrok for local testing)
- Check Paystack signature verification
- View Paystack dashboard webhook logs

---

**HNG Stage 8 Task Submission**
