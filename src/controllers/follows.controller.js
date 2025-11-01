import { asyncHandler } from "../utils/asyncHandler.js";
import { created, success } from "../utils/response.js";
import * as Follows from "../repositories/follows.repo.js";

export const follow = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const { user_id } = req.body;
  const r = await Follows.follow({ me, userId: Number(user_id) });
  return created(res, "User followed successfully", r);
});

export const unfollow = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const { user_id } = req.body;
  const r = await Follows.unfollow({ me, userId: Number(user_id) });
  return success(res, "User unfollowed successfully", r);
});
