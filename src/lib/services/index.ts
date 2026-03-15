// Re-export everything from service modules for backward compatibility
// Import from "@/lib/services" continues to work as before

export { stripUndefined, ADMIN_UIDS, isAdmin } from "./helpers";
export { ensureUserDoc, getUserRole, setUserRole, setUserBanned, getUserProfile } from "./users";
export { getTrades, getTradesByDateRange, addTrade, updateTrade, deleteTrade, updateUserTradeStats } from "./trades";
export { getJournals, addJournal, updateJournal, deleteJournal } from "./journal";
export { getLibrary, updateLibrary } from "./library";
export { uploadChartImage, deleteChartImage } from "./fileUpload";
export {
  shareTrade, getSharedTrade, updateSharedTrade,
  getCommunityStatsForTrades, getUserSharedTradesMap, deleteSharedTrade,
  getCommunityFeed, getUserPublicTrades, getCommunityFeedFollowing,
} from "./sharedTrades";
export type { CommunityStats, CommunityPost, CommunitySortMode, CommunityFeedResult } from "./sharedTrades";
export { toggleLike, hasUserLiked, batchCheckLikes, getComments, addComment, deleteComment, getAllComments, reportPost } from "./interactions";
export {
  followUser, unfollowUser, isFollowing,
  getFollowingList, getFollowersList, getFollowCounts,
  getSuggestedUsers,
} from "./follows";
export type { FollowedUser, SuggestedUser } from "./follows";
export {
  getRegisteredUsers, resetUserTrades, resetUserJournals, resetUserAll,
  createSmokeTestTrades, getAllReports, deleteReport,
} from "./admin";
export type { UserInfo } from "./admin";
