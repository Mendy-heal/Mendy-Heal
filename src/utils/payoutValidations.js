// utils/payoutValidations.js
import { z } from "zod";

// Cache for bank list to avoid repeated API calls
let bankListCache = null;
let bankListCacheTime = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Fetch Vietnamese banks from VietQR API
async function fetchVietnameseBanks() {
  try {
    const response = await fetch('https://api.vietqr.io/v2/banks');
    const data = await response.json();
    
    if (data.code === '00' && data.data) {
      return data.data.map(bank => ({
        id: bank.id,
        code: bank.code,
        name: bank.name,
        shortName: bank.shortName,
        bin: bank.bin,
        logo: bank.logo,
        transferSupported: bank.transferSupported,
        lookupSupported: bank.lookupSupported
      }));
    }
    
    throw new Error('Failed to fetch bank list from VietQR API');
  } catch (error) {
    console.error('Error fetching Vietnamese banks:', error);
    // Return fallback bank list if API fails
    return getFallbackBanks();
  }
}

// Fallback bank list in case API fails
function getFallbackBanks() {
  return [
    { id: 1, code: 'VCB', name: 'Vietcombank', shortName: 'VCB', bin: '970436', logo: '', transferSupported: 1, lookupSupported: 1 },
    { id: 2, code: 'TCB', name: 'Techcombank', shortName: 'TCB', bin: '970419', logo: '', transferSupported: 1, lookupSupported: 1 },
    { id: 3, code: 'CTG', name: 'Vietinbank', shortName: 'CTG', bin: '970413', logo: '', transferSupported: 1, lookupSupported: 1 },
    { id: 4, code: 'AGR', name: 'Agribank', shortName: 'AGR', bin: '970405', logo: '', transferSupported: 1, lookupSupported: 1 },
    { id: 5, code: 'DAB', name: 'DongA Bank', shortName: 'DAB', bin: '970406', logo: '', transferSupported: 1, lookupSupported: 1 },
    { id: 6, code: 'MB', name: 'MB Bank', shortName: 'MB', bin: '970418', logo: '', transferSupported: 1, lookupSupported: 1 },
    { id: 7, code: 'STB', name: 'Sacombank', shortName: 'STB', bin: '970403', logo: '', transferSupported: 1, lookupSupported: 1 },
    { id: 8, code: 'VPB', name: 'VPBank', shortName: 'VPB', bin: '970432', logo: '', transferSupported: 1, lookupSupported: 1 },
    { id: 9, code: 'TPB', name: 'TienPhongBank', shortName: 'TPB', bin: '970423', logo: '', transferSupported: 1, lookupSupported: 1 },
    { id: 10, code: 'OCB', name: 'OCB', shortName: 'OCB', bin: '970448', logo: '', transferSupported: 1, lookupSupported: 1 }
  ];
}

// Get Vietnamese banks with caching
export async function getVietnameseBanks() {
  const now = Date.now();
  
  // Return cached data if still valid
  if (bankListCache && bankListCacheTime && (now - bankListCacheTime) < CACHE_DURATION) {
    return bankListCache;
  }
  
  // Fetch new data
  const banks = await fetchVietnameseBanks();
  
  // Update cache
  bankListCache = banks;
  bankListCacheTime = now;
  
  return banks;
}

// Initialize bank list on module load
getVietnameseBanks().catch(error => {
  console.error('Failed to initialize bank list:', error);
});

export const createPayoutAccountSchema = z.object({
  bank_name: z.string()
    .min(3, "Bank name must be at least 3 characters")
    .max(100, "Bank name must not exceed 100 characters")
    .trim(),
  account_number: z.string()
    .min(8, "Account number must be at least 8 digits")
    .max(20, "Account number must not exceed 20 digits")
    .regex(/^\d[\d\s-]*\d$/, "Account number must contain only digits, spaces, and dashes")
    .transform(val => val.replace(/[\s-]/g, '')), // Remove spaces and dashes
  account_holder: z.string()
    .min(3, "Account holder name must be at least 3 characters")
    .max(100, "Account holder name must not exceed 100 characters")
    .regex(/^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵýỷỹ\s\.'-]+$/, 
      "Account holder name can only contain letters, spaces, dots, and hyphens")
    .trim()
});

export const updatePayoutAccountSchema = createPayoutAccountSchema.partial();

export const adminVerifyPayoutAccountSchema = z.object({
  user_id: z.number().positive("User ID must be a positive number")
});

export const adminListPayoutAccountsSchema = z.object({
  verified: z.enum(["true", "false"]).optional(),
  page: z.string().regex(/^\d+$/, "Page must be a number").transform(Number).optional(),
  limit: z.string().regex(/^\d+$/, "Limit must be a number").transform(Number).optional()
});

// Get Vietnamese bank list for validation (async function)
export async function getVietnameseBankList() {
  return await getVietnameseBanks();
}

// Legacy function for backward compatibility (synchronous)
export function getVietnameseBanksSync() {
  return bankListCache || getFallbackBanks();
}

// Helper function to validate bank name (async)
export async function validateBankName(bankName) {
  const banks = await getVietnameseBanks();
  const normalizedName = bankName.toLowerCase().trim();
  
  // Check against exact matches
  const exactMatch = banks.find(bank =>
    bank.name.toLowerCase() === normalizedName ||
    bank.code.toLowerCase() === normalizedName ||
    bank.shortName.toLowerCase() === normalizedName
  );
  
  if (exactMatch) return true;
  
  // Check partial matches (contains)
  const partialMatch = banks.find(bank =>
    bank.name.toLowerCase().includes(normalizedName) ||
    normalizedName.includes(bank.name.toLowerCase()) ||
    bank.shortName.toLowerCase().includes(normalizedName) ||
    normalizedName.includes(bank.shortName.toLowerCase())
  );
  
  return !!partialMatch || normalizedName.length >= 3;
}

// Synchronous version for backward compatibility
export function validateBankNameSync(bankName) {
  const banks = getVietnameseBanksSync();
  const normalizedName = bankName.toLowerCase().trim();
  
  // Check against exact matches
  const exactMatch = banks.find(bank =>
    bank.name.toLowerCase() === normalizedName ||
    bank.code.toLowerCase() === normalizedName ||
    bank.shortName.toLowerCase() === normalizedName
  );
  
  if (exactMatch) return true;
  
  // Check partial matches (contains)
  const partialMatch = banks.find(bank =>
    bank.name.toLowerCase().includes(normalizedName) ||
    normalizedName.includes(bank.name.toLowerCase()) ||
    bank.shortName.toLowerCase().includes(normalizedName) ||
    normalizedName.includes(bank.shortName.toLowerCase())
  );
  
  return !!partialMatch || normalizedName.length >= 3;
}

// Helper function to format account number
export function formatAccountNumber(accountNumber) {
  // Remove all non-digit characters
  const clean = accountNumber.replace(/\D/g, '');
  
  // Format with spaces every 4 digits
  if (clean.length <= 4) return clean;
  
  const groups = [];
  for (let i = clean.length; i > 0; i -= 4) {
    groups.unshift(clean.substring(Math.max(0, i - 4), i));
  }
  
  return groups.join(' ');
}

// Helper function to mask account number
export function maskAccountNumber(accountNumber) {
  const clean = accountNumber.replace(/\D/g, '');
  if (clean.length <= 4) return clean;
  
  const lastFour = clean.slice(-4);
  const maskedLength = Math.max(0, clean.length - 4);
  return '*'.repeat(maskedLength) + lastFour;
}

// Get bank information by code or name
export async function getBankInfo(bankIdentifier) {
  const banks = await getVietnameseBanks();
  const normalizedName = bankIdentifier.toLowerCase().trim();
  
  return banks.find(bank =>
    bank.name.toLowerCase() === normalizedName ||
    bank.code.toLowerCase() === normalizedName ||
    bank.shortName.toLowerCase() === normalizedName
  );
}

// Get all banks for dropdown/select options
export async function getBankOptions() {
  const banks = await getVietnameseBanks();
  return banks.map(bank => ({
    value: bank.code,
    label: `${bank.name} (${bank.code})`,
    shortName: bank.shortName,
    logo: bank.logo,
    bin: bank.bin
  }));
}

// Refresh bank list cache
export async function refreshBankList() {
  bankListCache = null;
  bankListCacheTime = null;
  return await getVietnameseBanks();
}