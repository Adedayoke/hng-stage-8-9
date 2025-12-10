# Wallet Service API - Stage 9

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
- Local: `http://localhost:3000/api-docs`
- Production: `https://your-app.up.railway.app/api-docs`

The Swagger documentation includes:
- All API endpoints with request/response examples
- JWT Bearer authentication
- API Key authentication (x-api-key header)
- Try-it-out functionality

## 🚀 Getting Started

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

## 🧪 Testing

### Using cURL

**Login with Google:**
Visit `http://localhost:3000/auth/google` in browser

**Create API Key:**
```bash
curl -X POST http://localhost:3000/keys/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-service",
    "permissions": ["read", "deposit"],
    "expiry": "1D"
  }'
```

**Deposit with API Key:**
```bash
curl -X POST http://localhost:3000/wallet/deposit \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000}'
```

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

1. **Webhook URL**: Configure in Paystack Dashboard: `https://yourdomain.com/wallet/paystack/webhook`
2. **API Keys**: Only shown once during creation - save immediately!
3. **Max Keys**: Maximum 5 active API keys per user
4. **Wallet Crediting**: ONLY webhooks credit wallets, not manual verification
5. **Expiry Format**: Must be `1H`, `1D`, `1M`, or `1Y`

## 📝 Environment Setup Guide

### 1. PostgreSQL Database
```bash
# Using Docker
docker run --name wallet-db -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres

# Connection string
DATABASE_URL="postgresql://postgres:password@localhost:5432/wallet_service"
```

### 2. Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect: `http://localhost:3000/auth/google/callback`

### 3. Paystack
1. Sign up at [Paystack](https://paystack.com/)
2. Get API keys from Settings > API Keys & Webhooks
3. Add webhook URL in dashboard

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

## 👨‍💻 Author

Native Dev

HNG Stage 9 Task Submission
