// services/payoutAccounts.service.js
import * as PayoutAccountsRepo from "../repositories/payoutAccounts.repo.js";
import * as UsersRepo from "../repositories/users.repo.js";
import { validateBankName, formatAccountNumber } from "../utils/payoutValidations.js";

export async function createOrUpdatePayoutAccount({ userId, bankName, accountNumber, accountHolder }) {
  // Validate user exists and is expert or listener
  const user = await UsersRepo.getProfileByUserId(userId);
  if (!user) {
    throw Object.assign(new Error("User not found"), { status: 404 });
  }
  
  if (!['EXPERT', 'LISTENER'].includes(user.role_primary)) {
    throw Object.assign(new Error("Only experts and listeners can add payout accounts"), { status: 403 });
  }
  
  // Validate inputs (basic validation, detailed validation is done in controller)
  if (!bankName || bankName.trim().length < 3) {
    throw Object.assign(new Error("Bank name must be at least 3 characters"), { status: 400 });
  }
  
  if (!await validateBankName(bankName)) {
    throw Object.assign(new Error("Invalid bank name"), { status: 400 });
  }
  
  // Format account number (remove spaces and dashes)
  const cleanAccountNumber = accountNumber.replace(/[\s-]/g, '');
  
  // Check if account holder name matches user's display name (for verification)
  const displayName = user.display_name?.trim().toLowerCase();
  const holderName = accountHolder.trim().toLowerCase();
  
  // If user has a display name, it should reasonably match the account holder name
  if (displayName && displayName.length > 0) {
    const displayNameParts = displayName.split(' ');
    const holderNameParts = holderName.split(' ');
    
    // Check if at least the last name matches
    const userLastName = displayNameParts[displayNameParts.length - 1];
    const holderLastName = holderNameParts[holderNameParts.length - 1];
    
    if (userLastName !== holderLastName && !holderName.includes(displayName)) {
      // Log warning but don't block - admin can verify later
      console.warn(`Account holder name mismatch for user ${userId}: "${accountHolder}" vs "${user.display_name}"`);
    }
  }
  
  // Create or update payout account
  const account = await PayoutAccountsRepo.createPayoutAccount({
    userId,
    bankName: bankName.trim(),
    accountNumber: cleanAccountNumber,
    accountHolder: accountHolder.trim()
  });
  
  // Return masked account number for security
  return {
    ...account,
    account_number: await PayoutAccountsRepo.maskAccountNumber(account.account_number)
  };
}

export async function getPayoutAccount(userId, requestUserId) {
  // Users can only view their own payout accounts
  if (userId !== requestUserId) {
    throw Object.assign(new Error("Access denied"), { status: 403 });
  }
  
  const account = await PayoutAccountsRepo.getMaskedPayoutAccount(userId);
  return account;
}

export async function updatePayoutAccount({ userId, bankName, accountNumber, accountHolder }, requestUserId) {
  // Users can only update their own payout accounts
  if (userId !== requestUserId) {
    throw Object.assign(new Error("Access denied"), { status: 403 });
  }
  
  // Check if account exists
  const existingAccount = await PayoutAccountsRepo.getPayoutAccountByUserId(userId);
  if (!existingAccount) {
    throw Object.assign(new Error("Payout account not found"), { status: 404 });
  }
  
  // If account is already verified, require admin to unverify first
  if (existingAccount.verified) {
    throw Object.assign(new Error("Cannot update verified account. Please contact admin"), { status: 400 });
  }
  
  // Validate inputs
  if (!bankName || bankName.trim().length < 3) {
    throw Object.assign(new Error("Bank name must be at least 3 characters"), { status: 400 });
  }
  
  if (!validateBankName(bankName)) {
    throw Object.assign(new Error("Invalid bank name"), { status: 400 });
  }
  
  const cleanAccountNumber = validateVietnameseAccountNumber(accountNumber);
  if (!cleanAccountNumber) {
    throw Object.assign(new Error("Invalid account number format"), { status: 400 });
  }
  
  if (!validateAccountHolderName(accountHolder)) {
    throw Object.assign(new Error("Invalid account holder name"), { status: 400 });
  }
  
  // Update payout account
  const account = await PayoutAccountsRepo.updatePayoutAccount({
    userId,
    bankName: bankName.trim(),
    accountNumber: cleanAccountNumber,
    accountHolder: accountHolder.trim()
  });
  
  // Return masked account number for security
  return {
    ...account,
    account_number: await PayoutAccountsRepo.maskAccountNumber(account.account_number)
  };
}

export async function deletePayoutAccount(userId, requestUserId) {
  // Users can only delete their own payout accounts
  if (userId !== requestUserId) {
    throw Object.assign(new Error("Access denied"), { status: 403 });
  }
  
  // Check if account exists
  const existingAccount = await PayoutAccountsRepo.getPayoutAccountByUserId(userId);
  if (!existingAccount) {
    throw Object.assign(new Error("Payout account not found"), { status: 404 });
  }
  
  // If account is verified, require admin to unverify first
  if (existingAccount.verified) {
    throw Object.assign(new Error("Cannot delete verified account. Please contact admin"), { status: 400 });
  }
  
  // Delete payout account
  const account = await PayoutAccountsRepo.deletePayoutAccount(userId);
  
  return {
    ...account,
    account_number: await PayoutAccountsRepo.maskAccountNumber(account.account_number)
  };
}

// Admin functions
export async function verifyPayoutAccount(userId) {
  const account = await PayoutAccountsRepo.getPayoutAccountByUserId(userId);
  if (!account) {
    throw Object.assign(new Error("Payout account not found"), { status: 404 });
  }
  
  if (account.verified) {
    throw Object.assign(new Error("Account already verified"), { status: 400 });
  }
  
  const verifiedAccount = await PayoutAccountsRepo.verifyPayoutAccount(userId);
  return verifiedAccount;
}

// Get full account details (admin only)
export async function getFullPayoutAccount(userId) {
  const account = await PayoutAccountsRepo.getPayoutAccountByUserId(userId);
  if (!account) {
    throw Object.assign(new Error("Payout account not found"), { status: 404 });
  }
  
  return account;
}