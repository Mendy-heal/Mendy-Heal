// repositories/payoutAccounts.repo.js
import { query } from "../config/db.js";

export async function createPayoutAccount({ userId, bankName, accountNumber, accountHolder }) {
  const { rows } = await query(
    `INSERT INTO app.payout_accounts (user_id, bank_name, account_number, account_holder, created_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (user_id) DO UPDATE SET
         bank_name = EXCLUDED.bank_name,
         account_number = EXCLUDED.account_number,
         account_holder = EXCLUDED.account_holder,
         verified = false,
         verified_at = null,
         created_at = now()
     RETURNING id, user_id, bank_name, account_number, account_holder, verified, verified_at, created_at`,
    [userId, bankName, accountNumber, accountHolder]
  );
  return rows[0];
}

export async function getPayoutAccountByUserId(userId) {
  const { rows } = await query(
    `SELECT id, user_id, bank_name, account_number, account_holder, verified, verified_at, created_at
     FROM app.payout_accounts 
     WHERE user_id = $1`,
    [userId]
  );
  return rows[0];
}

export async function updatePayoutAccount({ userId, bankName, accountNumber, accountHolder }) {
  const { rows } = await query(
    `UPDATE app.payout_accounts 
     SET bank_name = $2, 
         account_number = $3, 
         account_holder = $4,
         verified = false,
         verified_at = null
     WHERE user_id = $1
     RETURNING id, user_id, bank_name, account_number, account_holder, verified, verified_at, created_at`,
    [userId, bankName, accountNumber, accountHolder]
  );
  return rows[0];
}

export async function verifyPayoutAccount(userId) {
  const { rows } = await query(
    `UPDATE app.payout_accounts 
     SET verified = true, verified_at = now()
     WHERE user_id = $1
     RETURNING id, user_id, bank_name, account_number, account_holder, verified, verified_at, created_at`,
    [userId]
  );
  return rows[0];
}

export async function deletePayoutAccount(userId) {
  const { rows } = await query(
    `DELETE FROM app.payout_accounts 
     WHERE user_id = $1
     RETURNING id, user_id, bank_name, account_number, account_holder, verified, verified_at, created_at`,
    [userId]
  );
  return rows[0];
}

export async function maskAccountNumber(accountNumber) {
  if (!accountNumber || accountNumber.length < 4) return accountNumber;
  const lastFour = accountNumber.slice(-4);
  const maskedLength = Math.max(0, accountNumber.length - 4);
  return '*'.repeat(maskedLength) + lastFour;
}

// Get payout account with masked account number for security
export async function getMaskedPayoutAccount(userId) {
  const account = await getPayoutAccountByUserId(userId);
  if (!account) return null;
  
  return {
    ...account,
    account_number: await maskAccountNumber(account.account_number)
  };
}