import { query } from "../config/db.js";

export async function createUserWithHandle({ handle, passwordHash }) {
  const { rows } = await query(
    `INSERT INTO app.users (handle, password_hash)
     VALUES ($1, $2)
     RETURNING id, handle, role_primary, status, created_at`,
    [handle, passwordHash]
  );
  return rows[0];
}

export async function getByHandle(handle) {
  const { rows } = await query(
    `SELECT id, handle, password_hash, role_primary, is_email_verified, email
     FROM app.users
     WHERE handle = $1`,
    [handle]
  );
  return rows[0];
}

export async function findUserByEmail(email) {
  const { rows } = await query(
    `SELECT id, handle, email, password_hash, role_primary, is_email_verified
     FROM app.users WHERE email = $1`,
    [email]
  );
  return rows[0];
}

export async function upsertProfile({
  userId,
  displayName,
  avatarUrl,
  yob,
  gender,
  attachmentUrl,
  isAnonymous = true, // thêm tham số mới, mặc định true
}) {
  const prefs = { attachment_url: attachmentUrl ?? null };

  const { rows } = await query(
    `INSERT INTO app.user_profiles
       (user_id, display_name, avatar_url, year_of_birth, gender, preferences, is_anonymous)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id)
     DO UPDATE SET
         display_name   = EXCLUDED.display_name,
         avatar_url     = EXCLUDED.avatar_url,
         year_of_birth  = EXCLUDED.year_of_birth,
         gender         = EXCLUDED.gender,
         preferences    = EXCLUDED.preferences,
         is_anonymous   = EXCLUDED.is_anonymous,
         updated_at     = now()
     RETURNING user_id, display_name, avatar_url, year_of_birth, gender, preferences, is_anonymous`,
    [
      userId,
      displayName ?? null,
      avatarUrl ?? null,
      yob ?? null,
      gender ?? "UNSPECIFIED",
      prefs,
      isAnonymous,
    ]
  );

  return rows[0];
}



export async function setPrimaryRole(userId, role) {
  const { rows } = await query(
    `UPDATE app.users SET role_primary = $2, updated_at = now()
     WHERE id = $1 RETURNING id, role_primary`,
    [userId, role]
  );
  return rows[0];
}


export async function getById(id) {
  const { rows } = await query(
    `SELECT id, handle, email, role_primary, is_email_verified
       FROM app.users
      WHERE id = $1`,
    [id]
  );
  return rows[0];
}

export async function getProfileByUserId(userId) {
  const { rows } = await query(
    `SELECT
      u.id, u.handle, u.email, u.phone, u.role_primary, u.is_email_verified, u.status, u.created_at, u.updated_at,
      p.display_name, p.avatar_url, p.bio, p.gender, p.year_of_birth, p.updated_at as profile_updated_at, p.is_anonymous,
      COALESCE(p.preferences, '{}') as preferences,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'role', ur.role
          )
        ) FILTER (WHERE ur.role IS NOT NULL),
        '[]'::json
      ) as roles,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'id', uf.id,
            'file_type', uf.file_type,
            'file_url', uf.file_url,
            'mime_type', uf.mime_type,
            'byte_size', uf.byte_size,
            'created_at', uf.created_at
          )
        ) FILTER (WHERE uf.id IS NOT NULL),
        '[]'::json
      ) as files,
      COALESCE(
        jsonb_build_object(
          'id', ep.id,
          'specialties', ep.specialties,
          'price_per_session', ep.price_per_session,
          'rating_avg', ep.rating_avg,
          'kyc_status', ep.kyc_status,
          'intro', ep.intro
        ),
        NULL
      ) as expert_profile,
      COALESCE(
        jsonb_build_object(
          'id', lp.id,
          'intro', lp.intro,
          'verified', lp.verified
        ),
        NULL
      ) as listener_profile,
      COALESCE(
        jsonb_build_object(
          'id', w.id,
          'balance', w.balance
        ),
        NULL
      ) as wallet,
      COALESCE(
        (SELECT COUNT(*) FROM app.user_follows WHERE follower_id = $1),
        0
      ) as following_count,
      COALESCE(
        (SELECT COUNT(*) FROM app.user_follows WHERE followee_id = $1),
        0
      ) as followers_count,
      COALESCE(
        (SELECT COUNT(*) FROM app.posts WHERE author_id = $1),
        0
      ) as posts_count,
      COALESCE(
        (SELECT COUNT(*) FROM app.bookings WHERE expert_id = $1 AND status = 'COMPLETED'),
        0
      ) as completed_sessions
      FROM app.users u
      LEFT JOIN app.user_profiles p ON p.user_id = u.id
      LEFT JOIN app.user_roles ur ON ur.user_id = u.id
      LEFT JOIN app.user_files uf ON uf.user_id = u.id
      LEFT JOIN app.expert_profiles ep ON ep.user_id = u.id
      LEFT JOIN app.listener_profiles lp ON lp.user_id = u.id
      LEFT JOIN app.wallets w ON w.owner_user_id = u.id
      WHERE u.id = $1
      GROUP BY u.id, p.display_name, p.avatar_url, p.bio, p.gender, p.year_of_birth, p.updated_at, p.is_anonymous, p.preferences, ep.id, lp.id, w.id`,
    [userId]
  );
  return rows[0];
}
