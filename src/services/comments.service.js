import * as Comments from "../repositories/comments.repo.js";

export async function add({ me, postId, parentId, content }) {
  return Comments.addComment({ postId, authorId: me, parentId, content });
}
export async function update({ me, commentId, content }) {
  console.log(`[DEBUG] update comment service - User ID: ${me}, Comment ID: ${commentId}, Content: ${content}`);
  const c = await Comments.updateComment({ id: commentId, authorId: me, content });
  console.log(`[DEBUG] update comment service - Repository returned:`, c);
  if (!c) {
    console.log(`[DEBUG] update comment service - Comment not found or user not authorized, throwing error`);
    throw Object.assign(new Error("Not found or forbidden"), { status: 404 });
  }
  return c;
}
export async function remove({ me, commentId }) {
  const ok = await Comments.deleteComment({ id: commentId, authorId: me });
  if (!ok) throw Object.assign(new Error("Not found or forbidden"), { status: 404 });
  return { deleted: true };
}
export async function list({ postId, limit, before }) {
  return Comments.listComments({ postId, limit, before });
}
