import { asyncHandler } from "../utils/asyncHandler.js";
import { created, success, paginated } from "../utils/response.js";
import * as CommentsService from "../services/comments.service.js";

export const add = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const { post_id, parent_id, content } = req.body;
  const c = await CommentsService.add({
    me,
    postId: Number(post_id),
    parentId: parent_id ? Number(parent_id) : null,
    content
  });
  return created(res, "Comment added successfully", c);
});

export const update = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const { id } = req.params;
  const { content } = req.body;
  console.log(`[DEBUG] update comment controller - User ID: ${me}, Comment ID: ${id}, Content: ${content}`);
  const c = await CommentsService.update({ me, commentId: Number(id), content });
  console.log(`[DEBUG] update comment controller - Result:`, c);
  return success(res, "Comment updated successfully", c);
});

export const remove = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const { id } = req.params;
  const out = await CommentsService.remove({ me, commentId: Number(id) });
  return success(res, "Comment removed successfully", out);
});

export const list = asyncHandler(async (req, res) => {
  const { post_id, limit = 50, before } = req.query;
  const rows = await CommentsService.list({ postId: Number(post_id), limit: Number(limit), before });
  return paginated(res, "Comments retrieved successfully", rows, {
    limit: Number(limit),
    nextCursor: rows.at(-1)?.created_at
  });
});
