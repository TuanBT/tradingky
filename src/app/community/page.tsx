"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { TradeComment, UserRole } from "@/lib/types";
import {
  getCommunityFeed,
  getCommunityFeedFollowing,
  getFollowingList,
  toggleLike,
  hasUserLiked,
  getComments,
  addComment,
  deleteComment,
  reportPost,
  getUserRole,
  getSuggestedUsers,
  followUser,
  CommunityPost,
  CommunitySortMode,
  SuggestedUser,
} from "@/lib/services";
import { getImageSrc } from "@/lib/gdrive";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageLightbox } from "@/components/ImageLightbox";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHeart as faHeartSolid,
  faComment,
  faPlay,
  faFlagCheckered,
  faSpinner,
  faPaperPlane,
  faTrash,
  faFilter,
  faClock,
  faThumbsUp,
  faComments,
  faFlag,
  faXmark,
  faCrown,
  faUserShield,
  faBuildingColumns,
  faUserGroup,
  faGlobe,
  faUserPlus,
} from "@fortawesome/free-solid-svg-icons";
import { faHeart as faHeartOutline } from "@fortawesome/free-regular-svg-icons";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { DocumentSnapshot } from "firebase/firestore";
import Link from "next/link";

type ResultFilter = "ALL" | "WIN" | "LOSS" | "BREAKEVEN" | "CANCELLED";

const SORT_OPTIONS: { mode: CommunitySortMode; label: string; icon: typeof faClock }[] = [
  { mode: "newest", label: "Mới nhất", icon: faClock },
  { mode: "topLikes", label: "Nhiều like", icon: faThumbsUp },
  { mode: "topComments", label: "Nhiều bình luận", icon: faComments },
];

export default function CommunityPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [resultFilter, setResultFilter] = useState<ResultFilter>("ALL");
  const [pairFilter, setPairFilter] = useState<string>("ALL");
  const [platformFilter, setPlatformFilter] = useState<string>("ALL");
  const [sortMode, setSortMode] = useState<CommunitySortMode>("newest");
  const [lightboxSrc, setLightboxSrc] = useState("");
  const [feedTab, setFeedTab] = useState<"all" | "following">("all");
  const [hasFollowing, setHasFollowing] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [followingUids, setFollowingUids] = useState<Set<string>>(new Set());

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite scroll: auto-load when sentinel is visible
  useEffect(() => {
    if (!hasMore || loadingMore || loading) return;
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, loading, posts.length]);

  const loadFeed = useCallback(async (sort: CommunitySortMode, tab: "all" | "following") => {
    setLoading(true);
    try {
      if (tab === "following" && user) {
        const result = await getCommunityFeedFollowing(user.uid, 20);
        setPosts(result.posts);
        setLastDoc(null);
        setHasMore(result.hasMore);
      } else {
        const result = await getCommunityFeed(20, null, sort);
        setPosts(result.posts);
        setLastDoc(result.lastDoc);
        setHasMore(result.hasMore);
      }
    } catch {
      toast("Không thể tải bài viết", "error");
    }
    setLoading(false);
  }, [toast, user]);

  // Check if user follows anyone (to show the tab)
  useEffect(() => {
    if (!user) { setHasFollowing(false); return; }
    getFollowingList(user.uid).then((list) => setHasFollowing(list.length > 0));
  }, [user]);

  // Load suggested users
  useEffect(() => {
    if (!user) { setSuggestedUsers([]); return; }
    getSuggestedUsers(user.uid, 5).then(setSuggestedUsers);
  }, [user]);

  useEffect(() => {
    loadFeed(sortMode, feedTab);
  }, [sortMode, feedTab, loadFeed]);

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      if (feedTab === "following" && user) {
        // Following feed doesn't support cursor-based pagination, load all at once
        setLoadingMore(false);
        return;
      }
      const result = await getCommunityFeed(20, lastDoc, sortMode);
      setPosts((prev) => [...prev, ...result.posts]);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch {
      toast("Không thể tải thêm", "error");
    }
    setLoadingMore(false);
  };

  // Extract unique pairs and platforms from loaded posts
  const availablePairs = useMemo(() => {
    const pairs = new Set(posts.map((p) => p.data.trade.pair).filter(Boolean));
    return Array.from(pairs).sort();
  }, [posts]);

  const availablePlatforms = useMemo(() => {
    const platforms = new Set(posts.map((p) => p.data.trade.platform).filter(Boolean) as string[]);
    return Array.from(platforms).sort();
  }, [posts]);

  const filteredPosts = posts.filter((p) => {
    if (resultFilter !== "ALL" && p.data.trade.result !== resultFilter) return false;
    if (pairFilter !== "ALL" && p.data.trade.pair !== pairFilter) return false;
    if (platformFilter !== "ALL" && p.data.trade.platform !== platformFilter) return false;
    return true;
  });

  const hasActiveFilter = resultFilter !== "ALL" || pairFilter !== "ALL" || platformFilter !== "ALL";

  const clearFilters = () => {
    setResultFilter("ALL");
    setPairFilter("ALL");
    setPlatformFilter("ALL");
  };

  const handleFollowSuggested = async (targetUid: string) => {
    if (!user) return;
    try {
      await followUser(user.uid, targetUid);
      setFollowingUids((prev) => new Set(prev).add(targetUid));
      setSuggestedUsers((prev) => prev.filter((u) => u.uid !== targetUid));
      setHasFollowing(true);
      toast("Đã theo dõi!", "success");
    } catch {
      toast("Không thể theo dõi", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cộng đồng</h1>
        <span className="text-xs text-muted-foreground">{posts.length} bài viết</span>
      </div>

      {/* Feed tabs: All / Following */}
      {(hasFollowing || feedTab === "following") && (
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <button
            onClick={() => setFeedTab("all")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors rounded-t-md ${
              feedTab === "all"
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FontAwesomeIcon icon={faGlobe} className="h-3 w-3" />
            Tất cả
          </button>
          <button
            onClick={() => setFeedTab("following")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors rounded-t-md ${
              feedTab === "following"
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FontAwesomeIcon icon={faUserGroup} className="h-3 w-3" />
            Đang theo dõi
          </button>
        </div>
      )}

      {/* Sort buttons (only for "all" tab) */}
      {feedTab === "all" && (
      <div className="flex items-center gap-2 flex-wrap">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.mode}
            onClick={() => setSortMode(opt.mode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              sortMode === opt.mode
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            <FontAwesomeIcon icon={opt.icon} className="h-3 w-3" />
            {opt.label}
          </button>
        ))}
      </div>
      )}

      {/* Filters row */}
      {feedTab === "all" && (
      <div className="flex items-center gap-2 flex-wrap">
        {/* Result filter dropdown */}
        <select
          value={resultFilter}
          onChange={(e) => setResultFilter(e.target.value as ResultFilter)}
          className="px-2.5 py-1 text-xs font-medium rounded-md bg-card border border-border text-foreground cursor-pointer"
        >
          <option value="ALL">Tất cả kết quả</option>
          <option value="WIN">Thắng</option>
          <option value="LOSS">Thua</option>
          <option value="BREAKEVEN">Hoà</option>
          <option value="CANCELLED">Hủy</option>
        </select>

        {/* Pair filter */}
        {availablePairs.length > 0 && (
          <select
            value={pairFilter}
            onChange={(e) => setPairFilter(e.target.value)}
            className="px-2.5 py-1 text-xs font-medium rounded-md bg-card border border-border text-foreground cursor-pointer"
          >
            <option value="ALL">Tất cả cặp</option>
            {availablePairs.map((pair) => (
              <option key={pair} value={pair}>{pair}</option>
            ))}
          </select>
        )}

        {/* Platform filter */}
        {availablePlatforms.length > 0 && (
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-2.5 py-1 text-xs font-medium rounded-md bg-card border border-border text-foreground cursor-pointer"
          >
            <option value="ALL">Tất cả sàn</option>
            {availablePlatforms.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        )}

        {/* Clear filter button */}
        {hasActiveFilter && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md text-destructive hover:bg-destructive/10 transition-colors"
          >
            <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
            Xoá lọc
          </button>
        )}
      </div>
      )}

      {/* Empty state for following tab */}
      {feedTab === "following" && posts.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center h-[40vh] gap-4">
          <FontAwesomeIcon icon={faUserGroup} className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-muted-foreground">Chưa có bài viết từ người bạn theo dõi.</p>
        </div>
      )}

      {/* Suggested users to follow */}
      {suggestedUsers.length > 0 && feedTab === "all" && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <FontAwesomeIcon icon={faUserPlus} className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">Gợi ý theo dõi</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {suggestedUsers.map((su) => (
                <div key={su.uid} className="flex flex-col items-center gap-1.5 min-w-[80px]">
                  <Link href={`/profile/${su.uid}`}>
                    {su.photoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={su.photoURL} alt="" className="h-10 w-10 rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                        {su.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Link>
                  <Link href={`/profile/${su.uid}`} className="text-xs font-medium truncate max-w-[80px] text-center hover:underline">
                    {su.displayName}
                  </Link>
                  <span className="text-[10px] text-muted-foreground">
                    {su.totalLikes} <FontAwesomeIcon icon={faHeartSolid} className="h-2.5 w-2.5" /> · {su.postCount} bài
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] px-2"
                    onClick={() => handleFollowSuggested(su.uid)}
                  >
                    <FontAwesomeIcon icon={faUserPlus} className="h-2.5 w-2.5 mr-1" />
                    Theo dõi
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts */}
      {feedTab === "all" && filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[40vh] gap-4">
          <FontAwesomeIcon icon={faFilter} className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-muted-foreground">
            {posts.length === 0 ? "Chưa có bài viết nào trong cộng đồng." : "Không có bài viết phù hợp filter."}
          </p>
        </div>
      ) : (feedTab === "following" && posts.length === 0) ? null : (
        <div className="space-y-3">
          {(feedTab === "all" ? filteredPosts : posts).map((post) => (
            <CommunityCard
              key={post.id}
              post={post}
              currentUserId={user?.uid}
              onImageClick={setLightboxSrc}
            />
          ))}
          {hasMore && (
            <div ref={loadMoreRef} className="flex justify-center py-6">
              {loadingMore && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" />
                  Đang tải thêm...
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <ImageLightbox
        src={lightboxSrc}
        alt="Chart"
        open={!!lightboxSrc}
        onClose={() => setLightboxSrc("")}
      />
    </div>
  );
}

function RoleBadge({ role }: { role?: UserRole }) {
  if (role === "admin")
    return <FontAwesomeIcon icon={faCrown} className="h-3 w-3 text-yellow-500" title="Admin" />;
  if (role === "mod")
    return <FontAwesomeIcon icon={faUserShield} className="h-3 w-3 text-blue-500" title="Mod" />;
  return null;
}

function CommunityCard({
  post,
  currentUserId,
  onImageClick,
}: {
  post: CommunityPost;
  currentUserId?: string;
  onImageClick: (src: string) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data } = post;
  const { trade, privacy } = data;
  const isOpen = (trade.status || "CLOSED") === "OPEN";
  const resultColor = trade.result === "WIN" ? "text-green-500" : trade.result === "LOSS" ? "text-red-500" : trade.result === "CANCELLED" ? "text-gray-500" : "text-yellow-500";

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(data.likes || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<TradeComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>("user");
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const likeChecked = useRef(false);
  const roleChecked = useRef(false);

  // Check if current user has liked
  useEffect(() => {
    if (!currentUserId || likeChecked.current) return;
    likeChecked.current = true;
    hasUserLiked(post.id, currentUserId).then(setLiked);
  }, [currentUserId, post.id]);

  // Get current user's role
  useEffect(() => {
    if (!currentUserId || roleChecked.current) return;
    roleChecked.current = true;
    getUserRole(currentUserId).then(setCurrentUserRole);
  }, [currentUserId]);

  const isAdminOrMod = currentUserRole === "admin" || currentUserRole === "mod";

  const handleLike = async () => {
    if (!currentUserId) {
      toast("Đăng nhập để thích bài viết", "error");
      return;
    }
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => wasLiked ? c - 1 : c + 1);
    try {
      await toggleLike(post.id, currentUserId);
    } catch (err) {
      setLiked(wasLiked);
      setLikeCount((c) => wasLiked ? c + 1 : c - 1);
      toast((err as Error).message || "Lỗi", "error");
    }
  };

  const handleToggleComments = async () => {
    if (showComments) {
      setShowComments(false);
      return;
    }
    setShowComments(true);
    setLoadingComments(true);
    try {
      const result = await getComments(post.id);
      setComments(result);
    } catch {
      toast("Không thể tải bình luận", "error");
    }
    setLoadingComments(false);
  };

  const handleSubmitComment = async () => {
    if (!user || !commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const newComment = await addComment(
        post.id,
        user.uid,
        user.displayName || "Ẩn danh",
        user.photoURL || undefined,
        commentText.trim()
      );
      setComments((prev) => [...prev, newComment]);
      setCommentText("");
    } catch (err) {
      toast((err as Error).message || "Không thể gửi bình luận", "error");
    }
    setSubmittingComment(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(post.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast("Đã xoá bình luận", "success");
    } catch {
      toast("Không thể xoá bình luận", "error");
    }
    setDeleteCommentId(null);
  };

  const handleReport = async () => {
    if (!currentUserId || !reportReason.trim()) return;
    setReportSubmitting(true);
    try {
      await reportPost(post.id, currentUserId, reportReason.trim());
      toast("Đã báo cáo bài viết", "success");
      setShowReportDialog(false);
      setReportReason("");
    } catch (err) {
      toast((err as Error).message || "Không thể báo cáo", "error");
    }
    setReportSubmitting(false);
  };

  return (
    <>
      <Card className="overflow-hidden hover:border-primary/30 transition-colors">
        <CardContent className="p-0">
          {/* TradingView-inspired header bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/20">
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-bold text-base">{trade.pair}</span>
              <Badge className={`text-[10px] px-1.5 py-0 ${trade.type === "BUY" ? "bg-emerald-600 text-white" : "bg-orange-600 text-white"}`}>
                {trade.type}
              </Badge>
              {!isOpen ? (
                <span className={`text-sm font-semibold ${resultColor}`}>
                  {trade.result === "WIN" ? "Thắng" : trade.result === "LOSS" ? "Thua" : trade.result === "CANCELLED" ? "Hủy" : "Hoà"}
                </span>
              ) : (
                <Badge className="bg-blue-500/15 text-blue-500 border-blue-500/30 text-[10px] px-1.5 py-0">
                  <FontAwesomeIcon icon={faPlay} className="mr-0.5 h-2 w-2" />
                  OPEN
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!privacy.hidePnl && trade.pnl !== undefined && (
                <span className={`font-mono font-bold text-sm ${trade.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          <div className="p-4 space-y-3">
            {/* Author + meta row */}
            <div className="flex items-center gap-3">
              <Link href={`/profile/${data.ownerUid}`} className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
                {data.ownerPhotoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.ownerPhotoURL} alt="" className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                    {data.ownerDisplayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium truncate">{data.ownerDisplayName}</span>
                <RoleBadge role={data.ownerRole} />
              </Link>
              <div className="flex items-center gap-2 ml-auto text-xs text-muted-foreground flex-wrap justify-end">
                <span>{format(new Date(data.createdAt), "dd/MM HH:mm", { locale: vi })}</span>
                {trade.platform && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    <FontAwesomeIcon icon={faBuildingColumns} className="mr-0.5 h-2 w-2" />
                    {trade.platform}
                  </Badge>
                )}
                {trade.timeframe && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {trade.timeframe}
                  </Badge>
                )}
              </div>
            </div>

            {/* Chart image */}
            {trade.chartImageUrl && (
              <button type="button" onClick={() => onImageClick(getImageSrc(trade.chartImageUrl!))} className="block w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getImageSrc(trade.chartImageUrl)}
                  alt="Chart"
                  className="rounded-lg border w-full object-contain max-h-[280px] bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                />
              </button>
            )}

            {/* Note preview */}
            {trade.note && (
              <p className="text-sm text-muted-foreground line-clamp-2">{trade.note}</p>
            )}

            {/* Details tags */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <span>{format(parseISO(trade.date), "dd/MM/yyyy")}</span>
              {trade.emotion && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{trade.emotion}</Badge>}
            </div>

            {/* Like & Comment & Report bar */}
            <div className="flex items-center gap-4 pt-2 border-t border-border">
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
              >
                <FontAwesomeIcon icon={liked ? faHeartSolid : faHeartOutline} className="h-4 w-4" />
                <span>{likeCount > 0 ? likeCount : ""}</span>
              </button>
              <button
                onClick={handleToggleComments}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <FontAwesomeIcon icon={faComment} className="h-4 w-4" />
                <span>{(data.commentCount || 0) > 0 ? data.commentCount : ""}</span>
              </button>
              {currentUserId && currentUserId !== data.ownerUid && (
                <button
                  onClick={() => setShowReportDialog(true)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-orange-500 transition-colors"
                  title="Báo cáo"
                >
                  <FontAwesomeIcon icon={faFlag} className="h-3.5 w-3.5" />
                </button>
              )}
              <Link
                href={`/shared/${post.id}`}
                target="_blank"
                className="text-xs text-muted-foreground hover:text-foreground ml-auto transition-colors"
              >
                Xem chi tiết
              </Link>
            </div>
          </div>

          {/* Comments section */}
          {showComments && (
            <div className="border-t border-border px-4 py-3 space-y-3 bg-muted/10">
              {loadingComments ? (
                <div className="flex justify-center py-4">
                  <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {comments.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">Chưa có bình luận nào.</p>
                  )}
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2">
                      <Link href={`/profile/${comment.userId}`}>
                        {comment.photoURL ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={comment.photoURL} alt="" className="h-6 w-6 rounded-full shrink-0 mt-0.5" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                            {comment.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link href={`/profile/${comment.userId}`} className="text-sm font-medium hover:underline">{comment.displayName}</Link>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comment.createdAt), "dd/MM HH:mm")}
                          </span>
                          {(currentUserId === comment.userId || isAdminOrMod) && (
                            <button
                              onClick={() => setDeleteCommentId(comment.id)}
                              className="text-xs text-muted-foreground hover:text-destructive transition-colors ml-auto"
                              title={isAdminOrMod && currentUserId !== comment.userId ? "Xoá (Mod)" : "Xoá"}
                            >
                              <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm">{comment.text}</p>
                      </div>
                    </div>
                  ))}
                  {/* Comment input */}
                  {user ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Viết bình luận..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmitComment(); } }}
                        className="flex-1"
                        maxLength={500}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleSubmitComment}
                        disabled={!commentText.trim() || submittingComment}
                      >
                        {submittingComment ? (
                          <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" />
                        ) : (
                          <FontAwesomeIcon icon={faPaperPlane} className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center">Đăng nhập để bình luận</p>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report dialog */}
      {showReportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowReportDialog(false)}>
          <div className="bg-card rounded-lg border shadow-lg p-4 w-[90vw] max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Báo cáo bài viết</h3>
            <Textarea
              placeholder="Lý do báo cáo..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setShowReportDialog(false); setReportReason(""); }}>
                Huỷ
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleReport}
                disabled={!reportReason.trim() || reportSubmitting}
              >
                {reportSubmitting ? (
                  <FontAwesomeIcon icon={faSpinner} className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <FontAwesomeIcon icon={faFlag} className="h-3.5 w-3.5 mr-1" />
                )}
                Báo cáo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete comment confirmation */}
      <ConfirmDialog
        open={!!deleteCommentId}
        title="Xoá bình luận"
        message="Bạn chắc chắn muốn xoá bình luận này?"
        variant="danger"
        onConfirm={() => deleteCommentId && handleDeleteComment(deleteCommentId)}
        onClose={() => setDeleteCommentId(null)}
      />
    </>
  );
}
