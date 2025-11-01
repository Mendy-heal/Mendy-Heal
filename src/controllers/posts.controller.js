import { asyncHandler } from "../utils/asyncHandler.js";
import { created, success, failure, paginated } from "../utils/response.js";
import * as PostsService from "../services/posts.service.js";

// Nếu bạn upload file trước vào app.user_files -> client sẽ gửi mảng file_id
export const create = asyncHandler(async (req, res) => {
    const me = req.user.id;
    const { title, content, privacy, file_ids } = req.body;
    const p = await PostsService.create({
        me,
        title,
        content,
        privacy,
        fileIds: Array.isArray(file_ids) ? file_ids.map(Number) : undefined
    });
    return created(res, "Post created successfully", p);
});

export const update = asyncHandler(async (req, res) => {
    const me = req.user.id;
    const { id } = req.params;
    const { title, content, privacy } = req.body;
    const p = await PostsService.update({ me, postId: Number(id), title, content, privacy });
    return success(res, "Post updated successfully", p);
});

export const remove = asyncHandler(async (req, res) => {
    const me = req.user.id;
    const { id } = req.params;
    const out = await PostsService.remove({ me, postId: Number(id) });
    return success(res, "Post removed successfully", out);
});

export const detail = asyncHandler(async (req, res) => {
    const me = req.user.id;
    const { id } = req.params;
    const p = await PostsService.detail({ me, postId: Number(id) });
    return success(res, "Post details retrieved successfully", p);
});

export const timeline = asyncHandler(async (req, res) => {
    const me = req.user.id;
    const { user_id, limit = 20, before } = req.query;
    // Validate user_id parameter
    if (!user_id || isNaN(Number(user_id))) {
        return failure(res, "Invalid or missing user_id parameter", { field: "user_id" });
    }
    const rows = await PostsService.timeline({ me, ownerId: Number(user_id), limit: Number(limit), before });
    return paginated(res, "Timeline retrieved successfully", rows, {
        limit: Number(limit),
        nextCursor: rows.at(-1)?.created_at
    });
});

export const feed = asyncHandler(async (req, res) => {
    const me = req.user.id;
    const { limit = 20, before } = req.query;
    const rows = await PostsService.homeFeed({ me, limit: Number(limit), before });
    return paginated(res, "Feed retrieved successfully", rows, {
        limit: Number(limit),
        nextCursor: rows.at(-1)?.created_at
    });
});

export const react = asyncHandler(async (req, res) => {
    const me = req.user.id;
    const { id } = req.params;
    const { reaction } = req.body;
    const r = await PostsService.react({ me, postId: Number(id), reaction });
    return created(res, "Reaction added successfully", r);
});


export const unreact = asyncHandler(async (req, res) => {
    const me = req.user.id;
    const { id } = req.params;
    const r = await PostsService.unreact({ me, postId: Number(id) });
    return success(res, "Reaction removed successfully", r);
});

export const save = asyncHandler(async (req, res) => {
    const me = req.user.id;
    const { id } = req.params;
    const out = await PostsService.save({ me, postId: Number(id) });
    return created(res, "Post saved successfully", out);
});

export const unsave = asyncHandler(async (req, res) => {
    const me = req.user.id;
    const { id } = req.params;
    const out = await PostsService.unsave({ me, postId: Number(id) });
    return success(res, "Post unsaved successfully", out);
});
