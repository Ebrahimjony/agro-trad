import crypto from 'crypto';
import { Inquiry, SheetsConfig } from '../src/types';
import { db } from './db';

const ALLOWED_APPS_SCRIPT_HOSTS = new Set(['script.google.com', 'script.googleusercontent.com']);

export function validateAppsScriptUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Invalid Google Apps Script URL format.');
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('Google Apps Script URL must use https://');
  }
  if (!ALLOWED_APPS_SCRIPT_HOSTS.has(parsed.hostname)) {
    throw new Error('Webhook URL must point to script.google.com or script.googleusercontent.com.');
  }
  return parsed.toString();
}

export async function getEffectiveSheetsConfig(): Promise<SheetsConfig> {
  const settings = await db.getSettings();
  const envWebhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim() || '';
  const envSpreadsheetId = process.env.GOOGLE_SPREADSHEET_ID?.trim() || '';
  const envServiceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || '';
  const envPrivateKey = process.env.GOOGLE_PRIVATE_KEY?.trim() || '';

  return {
    webhookUrl: envWebhook || settings.sheetsWebhookUrl || '',
    spreadsheetId: envSpreadsheetId || settings.sheetsSpreadsheetId || '',
    sheetName: settings.sheetsTabName || 'Inquiries',
    hasEnvWebhook: Boolean(envWebhook),
    hasEnvServiceAccount: Boolean(envSpreadsheetId && envServiceEmail && envPrivateKey),
  };
}

async function getGoogleServiceAccountToken(email: string, rawPrivateKey: string): Promise<string> {
  const privateKey = rawPrivateKey.replace(/\\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claim = Buffer.from(
    JSON.stringify({
      iss: email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    })
  ).toString('base64url');

  const unsigned = `${header}.${claim}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  const signature = signer.sign(privateKey, 'base64url');
  const assertion = `${unsigned}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Google OAuth token exchange failed (${tokenRes.status}): ${errText.slice(0, 150)}`);
  }
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    throw new Error('Google OAuth token response missing access_token.');
  }
  return tokenJson.access_token;
}

export async function pushInquiryToGoogleSheets(
  inquiry: Inquiry
): Promise<{ status: 'synced' | 'pending' | 'failed'; message: string }> {
  const cfg = await getEffectiveSheetsConfig();
  const envServiceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || '';
  const envPrivateKey = process.env.GOOGLE_PRIVATE_KEY?.trim() || '';

  // Method 1: Google Sheets API v4 via Backend Service Account
  if (cfg.spreadsheetId && envServiceEmail && envPrivateKey) {
    try {
      const accessToken = await getGoogleServiceAccountToken(envServiceEmail, envPrivateKey);
      const tabRange = encodeURIComponent(`${cfg.sheetName || 'Sheet1'}!A:I`);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        cfg.spreadsheetId
      )}/values/${tabRange}:append?valueInputOption=USER_ENTERED`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [
            [
              inquiry.createdAt,
              inquiry.id,
              inquiry.productNumber,
              inquiry.productName,
              inquiry.customerName,
              inquiry.phoneNumber,
              inquiry.quantity,
              inquiry.address || '',
              inquiry.message || '',
            ],
          ],
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        return {
          status: 'failed',
          message: `Google Sheets API error (${res.status}): ${text.slice(0, 140)}`,
        };
      }

      return {
        status: 'synced',
        message: 'Appended directly via Google Sheets API.',
      };
    } catch (err) {
      return {
        status: 'failed',
        message: (err as Error).message,
      };
    }
  }

  // Method 2: Google Apps Script Web App Webhook
  if (cfg.webhookUrl) {
    try {
      const safeUrl = validateAppsScriptUrl(cfg.webhookUrl);
      const res = await fetch(safeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: inquiry.createdAt,
          inquiryId: inquiry.id,
          productNumber: inquiry.productNumber,
          productName: inquiry.productName,
          customerName: inquiry.customerName,
          phoneNumber: inquiry.phoneNumber,
          quantity: inquiry.quantity,
          address: inquiry.address || '',
          message: inquiry.message || '',
        }),
      });

      if (!res.ok) {
        return {
          status: 'failed',
          message: `Apps Script responded with HTTP ${res.status}.`,
        };
      }

      return {
        status: 'synced',
        message: 'Synced to Google Sheets via Apps Script webhook.',
      };
    } catch (err) {
      return {
        status: 'failed',
        message: (err as Error).message,
      };
    }
  }

  return {
    status: 'pending',
    message: 'Saved in database. Configure Google Sheets webhook or API credentials in Admin Dashboard to auto-sync.',
  };
}
