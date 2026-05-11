const ADMIN_EMAIL = "renan.kael@gmail.com";

const STAR_LEVELS = [
  { stars: 1, posts: 1, comments: 0 },
  { stars: 2, posts: 5, comments: 1 },
  { stars: 3, posts: 10, comments: 3 },
  { stars: 4, posts: 20, comments: 8 },
  { stars: 5, posts: 30, comments: 15 },
];

export function normalizeUserKey(value) {
  return String(value || "").replace(/^@+/, "").replace(/\s+/g, "").toLowerCase().trim();
}

export function getUserKeys(user) {
  return [
    normalizeUserKey(user?.email),
    normalizeUserKey(user?.handle || user?.username),
    normalizeUserKey(user?.username),
  ].filter(Boolean);
}

export function isSameUser(a, b) {
  const aKeys = getUserKeys(a);
  const bKeys = getUserKeys(b);
  return aKeys.some((key) => bKeys.includes(key));
}

export function calculateStars(stats, user) {
  if ((user?.email || "").toLowerCase() === ADMIN_EMAIL || user?.isAdmin) return 6;

  const progress = {
    postsCreated: Number(stats?.postsCreated || 0),
    commentsMade: Number(stats?.commentsMade || 0),
    firstPostAwarded: !!stats?.firstPostAwarded,
  };

  return STAR_LEVELS.reduce((total, level) => {
    const hasPosts = progress.postsCreated >= level.posts;
    const hasComments = progress.commentsMade >= level.comments;
    const hasFirstPost = level.stars !== 1 || progress.firstPostAwarded || progress.postsCreated >= 1;
    return hasPosts && hasComments && hasFirstPost ? level.stars : total;
  }, 0);
}

function mergeStats(currentStats, nextStats) {
  return {
    postsCreated: Math.max(
      Number(currentStats?.postsCreated || 0),
      Number(nextStats?.postsCreated || 0)
    ),
    commentsMade: Math.max(
      Number(currentStats?.commentsMade || 0),
      Number(nextStats?.commentsMade || 0)
    ),
    firstPostAwarded: !!currentStats?.firstPostAwarded || !!nextStats?.firstPostAwarded,
  };
}

function progressForUser(user, posts) {
  const stats = {
    postsCreated: 0,
    commentsMade: 0,
    firstPostAwarded: false,
  };

  posts.forEach((post) => {
    if (isSameUser(post, user)) {
      stats.postsCreated += 1;
      stats.firstPostAwarded = true;
    }

    const commentsList = Array.isArray(post?.commentsList) ? post.commentsList : [];
    commentsList.forEach((comment) => {
      if (isSameUser(comment, user)) {
        stats.commentsMade += 1;
      }
    });
  });

  return stats;
}

export function applyStarProgress(user, nextStats) {
  const starStats = mergeStats(user?.starStats, nextStats);
  const avaliacao = calculateStars(starStats, user);

  return {
    ...user,
    starStats,
    avaliacao,
    estrelas: avaliacao,
  };
}

export function syncUsersStarProgress(users, posts) {
  const userList = Array.isArray(users) ? users : [];
  const postList = Array.isArray(posts) ? posts : [];

  return userList.map((user) => {
    if (!user) return user;
    return applyStarProgress(user, progressForUser(user, postList));
  });
}

function updateStoredUser(updatedUser) {
  const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
  const updatedUsers = usuarios.map((item) =>
    isSameUser(item, updatedUser) ? updatedUser : item
  );
  const exists = updatedUsers.some((item) => isSameUser(item, updatedUser));
  const nextUsers = exists ? updatedUsers : [...updatedUsers, updatedUser];

  localStorage.setItem("usuarios", JSON.stringify(nextUsers));

  const localUser = JSON.parse(localStorage.getItem("usuarioLogado"));
  const sessionUser = JSON.parse(sessionStorage.getItem("usuarioLogado"));

  if (localUser && isSameUser(localUser, updatedUser)) {
    localStorage.setItem("usuarioLogado", JSON.stringify(updatedUser));
  }
  if (sessionUser && isSameUser(sessionUser, updatedUser)) {
    sessionStorage.setItem("usuarioLogado", JSON.stringify(updatedUser));
  }

  return updatedUser;
}

export function recordUserPostProgress(user) {
  const previousStars = Number(user?.avaliacao || user?.estrelas || 0);
  const nextStats = {
    ...user?.starStats,
    postsCreated: Number(user?.starStats?.postsCreated || 0) + 1,
    firstPostAwarded: true,
  };
  const updatedUser = updateStoredUser(applyStarProgress(user, nextStats));

  return {
    updatedUser,
    previousStars,
    newStars: Number(updatedUser.avaliacao || 0),
  };
}

export function recordUserCommentProgress(user) {
  const previousStars = Number(user?.avaliacao || user?.estrelas || 0);
  const nextStats = {
    ...user?.starStats,
    commentsMade: Number(user?.starStats?.commentsMade || 0) + 1,
  };
  const updatedUser = updateStoredUser(applyStarProgress(user, nextStats));

  return {
    updatedUser,
    previousStars,
    newStars: Number(updatedUser.avaliacao || 0),
  };
}
