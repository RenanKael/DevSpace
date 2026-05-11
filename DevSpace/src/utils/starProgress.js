const ADMIN_EMAIL = "renan.kael@gmail.com";

const STAR_LEVELS = [
  { stars: 1, posts: 1 },
  { stars: 2, posts: 5, comments: 1 },
  { stars: 3, posts: 50, comments: 100, likes: 150, reposts: 70 },
  { stars: 4, posts: 500, comments: 700, likes: 1000, reposts: 500 },
  { stars: 5, posts: 1500, comments: 200, likes: 4000, reposts: 300, saves: 10, downloads: 2 },
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
  if ((user?.email || "").toLowerCase() === ADMIN_EMAIL || user?.isAdmin) return 5;

  const progress = {
    postsCreated: Number(stats?.postsCreated || 0),
    commentsMade: Number(stats?.commentsMade || 0),
    likesMade: Number(stats?.likesMade || 0),
    repostsMade: Number(stats?.repostsMade || 0),
    savesMade: Number(stats?.savesMade || 0),
    downloadsMade: Number(stats?.downloadsMade || 0),
  };

  let stars = 0;
  for (const level of STAR_LEVELS) {
    const hasPosts = progress.postsCreated >= level.posts;
    const hasComments = progress.commentsMade >= (level.comments || 0);
    const hasLikes = progress.likesMade >= (level.likes || 0);
    const hasReposts = progress.repostsMade >= (level.reposts || 0);
    const hasSaves = progress.savesMade >= (level.saves || 0);
    const hasDownloads = progress.downloadsMade >= (level.downloads || 0);
    if (hasPosts && hasComments && hasLikes && hasReposts && hasSaves && hasDownloads) {
      stars = level.stars;
    } else {
      break;
    }
  }
  return Math.min(5, stars);
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
    likesMade: Math.max(
      Number(currentStats?.likesMade || 0),
      Number(nextStats?.likesMade || 0)
    ),
    repostsMade: Math.max(
      Number(currentStats?.repostsMade || 0),
      Number(nextStats?.repostsMade || 0)
    ),
    savesMade: Math.max(
      Number(currentStats?.savesMade || 0),
      Number(nextStats?.savesMade || 0)
    ),
    downloadsMade: Math.max(
      Number(currentStats?.downloadsMade || 0),
      Number(nextStats?.downloadsMade || 0)
    ),
    firstPostAwarded: !!currentStats?.firstPostAwarded || !!nextStats?.firstPostAwarded,
  };
}

function progressForUser(user, posts) {
  const stats = {
    postsCreated: 0,
    commentsMade: 0,
    likesMade: 0,
    repostsMade: 0,
    savesMade: 0,
    downloadsMade: 0,
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

    const likesList = Array.isArray(post?.likes) ? post.likes : [];
    likesList.forEach((liker) => {
      if (isSameUser({ handle: liker }, user)) {
        stats.likesMade += 1;
      }
    });

    const repostsList = Array.isArray(post?.reposts) ? post.reposts : [];
    repostsList.forEach((reposter) => {
      if (isSameUser({ handle: reposter }, user)) {
        stats.repostsMade += 1;
      }
    });

    const savesList = Array.isArray(post?.saves) ? post.saves : [];
    savesList.forEach((saver) => {
      if (isSameUser({ handle: saver }, user)) {
        stats.savesMade += 1;
      }
    });

    const downloadsList = Array.isArray(post?.downloads) ? post.downloads : [];
    downloadsList.forEach((downloader) => {
      if (isSameUser({ handle: downloader }, user)) {
        stats.downloadsMade += 1;
      }
    });
  });

  return stats;
}

export function applyStarProgress(user, nextStats) {
  const starStats = mergeStats(user?.starStats, nextStats);
  const antigaStars = Number(user?.avaliacao || user?.estrelas || 0);
  const novaAvaliacao = calculateStars(starStats, user);

  if (novaAvaliacao > antigaStars) {
    const prevLevel = STAR_LEVELS.find(l => l.stars === antigaStars);
    if (prevLevel) {
      starStats.commentsMade = Math.max(0, Number(starStats.commentsMade || 0) - (prevLevel.comments || 0));
      starStats.likesMade = Math.max(0, Number(starStats.likesMade || 0) - (prevLevel.likes || 0));
      starStats.repostsMade = Math.max(0, Number(starStats.repostsMade || 0) - (prevLevel.reposts || 0));
      // saves e downloads não resetam
    }
  }

  return {
    ...user,
    starStats,
    avaliacao: novaAvaliacao,
    estrelas: novaAvaliacao,
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

export function recordUserLikeProgress(user) {
  const previousStars = Number(user?.avaliacao || user?.estrelas || 0);
  const nextStats = {
    ...user?.starStats,
    likesMade: Number(user?.starStats?.likesMade || 0) + 1,
  };
  const updatedUser = updateStoredUser(applyStarProgress(user, nextStats));

  return {
    updatedUser,
    previousStars,
    newStars: Number(updatedUser.avaliacao || 0),
  };
}

export function recordUserRepostProgress(user) {
  const previousStars = Number(user?.avaliacao || user?.estrelas || 0);
  const nextStats = {
    ...user?.starStats,
    repostsMade: Number(user?.starStats?.repostsMade || 0) + 1,
  };
  const updatedUser = updateStoredUser(applyStarProgress(user, nextStats));

  return {
    updatedUser,
    previousStars,
    newStars: Number(updatedUser.avaliacao || 0),
  };
}

export function recordUserSaveProgress(user) {
  const previousStars = Number(user?.avaliacao || user?.estrelas || 0);
  const nextStats = {
    ...user?.starStats,
    savesMade: Number(user?.starStats?.savesMade || 0) + 1,
  };
  const updatedUser = updateStoredUser(applyStarProgress(user, nextStats));

  return {
    updatedUser,
    previousStars,
    newStars: Number(updatedUser.avaliacao || 0),
  };
}

export function recordUserDownloadProgress(user) {
  const previousStars = Number(user?.avaliacao || user?.estrelas || 0);
  const nextStats = {
    ...user?.starStats,
    downloadsMade: Number(user?.starStats?.downloadsMade || 0) + 1,
  };
  const updatedUser = updateStoredUser(applyStarProgress(user, nextStats));

  return {
    updatedUser,
    previousStars,
    newStars: Number(updatedUser.avaliacao || 0),
  };
}
