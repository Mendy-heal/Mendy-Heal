// controllers/banks.controller.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { success, failure } from "../utils/response.js";
import { getBankOptions, refreshBankList } from "../utils/payoutValidations.js";

export const getBankList = asyncHandler(async (req, res) => {
  try {
    const banks = await getBankOptions();
    return success(res, "Bank list retrieved successfully", { banks });
  } catch (error) {
    console.error("Error fetching bank list:", error);
    return failure(res, "Failed to fetch bank list");
  }
});

export const refreshBanks = asyncHandler(async (req, res) => {
  try {
    const banks = await refreshBankList();
    const bankOptions = banks.map(bank => ({
      value: bank.code,
      label: `${bank.name} (${bank.code})`,
      shortName: bank.shortName,
      logo: bank.logo,
      bin: bank.bin
    }));
    
    return success(res, "Bank list refreshed successfully", { banks: bankOptions });
  } catch (error) {
    console.error("Error refreshing bank list:", error);
    return failure(res, "Failed to refresh bank list");
  }
});