// Paystack Service
// WHY: Handle all Paystack API interactions

import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config/env';

const paystackApi = axios.create({
  baseURL: 'https://api.paystack.co',
  headers: {
    Authorization: `Bearer ${config.paystack.secretKey}`,
    'Content-Type': 'application/json',
  },
});

/**
 * Initialize Paystack transaction
 * WHY: Get payment link for user to complete payment
 * 
 * Returns: authorization_url, access_code, reference
 */
export async function initializeTransaction(
  email: string,
  amount: number,
  reference: string
) {
  try {
    // Amount must be in kobo (smallest currency unit)
    // WHY: Paystack uses kobo, not naira
    const amountInKobo = Math.round(amount * 100);

    const payload: any = {
      email,
      amount: amountInKobo,
      reference,
    };

    // Only add callback_url if FRONTEND_URL is set and not default
    if (config.frontendUrl && config.frontendUrl !== 'http://localhost:5173') {
      payload.callback_url = `${config.frontendUrl}/payment/callback`;
    }

    const response = await paystackApi.post('/transaction/initialize', payload);

    return {
      success: true,
      data: response.data.data,
    };
  } catch (error: any) {
    console.error('Paystack initialization error:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to initialize payment',
    };
  }
}

/**
 * Verify Paystack transaction
 * WHY: Manual verification as fallback (webhook is primary method)
 * 
 * NOTE: This should NOT credit wallets - only webhook does that!
 */
export async function verifyTransaction(reference: string) {
  try {
    const response = await paystackApi.get(`/transaction/verify/${reference}`);
    
    return {
      success: true,
      data: response.data.data,
    };
  } catch (error: any) {
    console.error('Paystack verification error:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || 'Verification failed',
    };
  }
}

/**
 * Verify Paystack webhook signature
 * WHY: CRITICAL SECURITY - prevent fake webhook requests!
 * 
 * How it works:
 * 1. Paystack signs webhook body with secret key
 * 2. We compute same signature
 * 3. If they match, webhook is genuine
 */
export function verifyWebhookSignature(
  requestBody: string,
  paystackSignature: string
): boolean {
  // Compute HMAC SHA512 hash
  const hash = crypto
    .createHmac('sha512', config.paystack.secretKey)
    .update(requestBody)
    .digest('hex');

  // Compare signatures
  return hash === paystackSignature;
}
