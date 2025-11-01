import * as Posts from "../repositories/posts.repo.js";
import * as Follows from "../repositories/follows.repo.js";

const PRIV = new Set(["PUBLIC", "FRIENDS", "ONLY_ME", "CUSTOM"]);
const REACTIONS = new Set(["LIKE", "LOVE", "CARE", "HAHA", "WOW", "SAD", "ANGRY"]);
function deriveTitle(raw) {
    const s = String(raw ?? "").trim();
    if (!s) return "Untitled";
    // Lấy dòng đầu tiên, tối đa 120 ký tự
    const firstLine = s.split(/\r?\n/)[0].replace(/\s+/g, " ").slice(0, 120);
    return firstLine || "Untitled";
}
export async function create({ me, title, content, privacy = "PUBLIC", fileIds }) {
    privacy = privacy.toUpperCase();
    if (!PRIV.has(privacy)) throw Object.assign(new Error("Invalid privacy"), { status: 400 });
    const safeTitle =
        title === undefined ? deriveTitle(content)
            : (String(title).trim() || deriveTitle(content));
    const p = await Posts.createPost({
        authorId: me,
        title: safeTitle,
        content,
        privacy
    });
    if (fileIds?.length) await Posts.attachFiles(p.id, fileIds);
    return p;
}

export async function update({ me, postId, title, content, privacy = "PUBLIC" }) {
    privacy = privacy.toUpperCase();
    if (!PRIV.has(privacy)) throw Object.assign(new Error("Invalid privacy"), { status: 400 });
    const safeTitle = title === undefined ? undefined : (String(title).trim() || deriveTitle(content));
    const p = await Posts.updatePost({ postId, authorId: me, title: safeTitle, content, privacy });
    if (!p) throw Object.assign(new Error("Not found or forbidden"), { status: 404 });
    return p;
}

export async function remove({ me, postId }) {
    const ok = await Posts.deletePost({ postId, authorId: me });
    if (!ok) throw Object.assign(new Error("Not found or forbidden"), { status: 404 });
    return { deleted: true };
}

export async function detail({ me, postId }) {
    const p = await Posts.getPostDetail(postId);
    if (!p) throw Object.assign(new Error("Not found"), { status: 404 });

    // check privacy
    if (p.privacy === "PRIVATE" && p.author_id !== Number(me))
        throw Object.assign(new Error("Forbidden"), { status: 403 });
    if (p.privacy === "FOLLOWERS" && p.author_id !== Number(me)) {
        const ok = await Follows.isFollower({ followerId: me, followeeId: p.author_id });
        if (!ok) throw Object.assign(new Error("Forbidden"), { status: 403 });
    }

    const files = await Posts.listPostFiles(postId);
    return { ...p, files };
}

export async function timeline({ me, ownerId, limit, before }) {
    // note: privacy sẽ được FE filter thêm nếu cần; ở BE, để đơn giản ta vẫn cho xem,
    // nhưng gọi detail khi cần bảo vệ nghiêm ngặt. Hoặc lọc ở query nâng cao.
    const rows = await Posts.listTimeline({ ownerId, limit, before });
    return rows;
}

export async function homeFeed({ me, limit, before }) {
    return Posts.listHomeFeed({ me, limit, before });
}

export async function react({ me, postId, reaction }) {
    reaction = String(reaction || "").toUpperCase();
    if (!REACTIONS.has(reaction)) throw Object.assign(new Error("Invalid reaction"), { status: 400 });
    return Posts.reactPost({ postId, userId: me, reaction });
}


export async function unreact({ me, postId }) {
    return { removed: await Posts.unreactPost({ postId, userId: me }) };
}

export async function save({ me, postId }) {
    const r = await Posts.savePost({ postId, userId: me });
    return { saved: !!r };
}
export async function unsave({ me, postId }) {
    return { removed: await Posts.unsavePost({ postId, userId: me }) };
}
