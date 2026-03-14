"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { TradeComment, UserRole } from "@/lib/types";
import {
  getCommunityFeed,
  toggleLike,
  hasUserLiked,
  getComments,
  addComment,
  deleteComment,
  reportPost,
  getUserRole,
  CommunityPost,
  CommunitySortMode,
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
  faEyeSlash,
  faSpinner,
  faPaperPlane,
  faTrash,
  faChevronDown,
  faFilter,
  faClock,
  faThumbsUp,
  faComments,
  faFlag,
  faXmark,
  faCrown,
  faUserShield,
} from "@fortawesome/free-solid-svg-icons";
import { faHeart as faHeartOutline } from "@fortawesome/free-regular-svg-icons";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { DocumentSnapshot } from "firebase/firestore";

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
  const [sortMode, setSortMode] = useState<CommunitySortMode>("newest");
  const [lightboxSrc, setLightboxSrc] = useState("");

  const loadFeed = useCallback(async (sort: CommunitySortMode) => {
    setLoading(true);
    try {
      const result = await getCommunityFeed(20, null, sort);
      setPosts(result.posts);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch {
      toast("Không thể tải bài viết", "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    loadFeed(sortMode);
  }, [sortMode, loadFeed]);

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await getCommunityFeed(20, lastDoc, sortMode);
      setPosts((prev) => [...prev, ...result.posts]);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch {
      toast("Không thể tải thêm", "error");
    }
    setLoadingMore(false);
  };

  // Extract unique pairs from loaded posts for pair filter
  const availablePairs = useMemo(() => {
    const pairs = new Set(posts.map((p) => p.data.trade.pair).filter(Boolean));
    return Array.from(pairs).sort();
  }, [posts]);

  const filteredPosts = posts.filter((p) => {
    if (resultFilter !== "ALL" && p.data.trade.result !== resultFilter) return false;
    if (pairFilter !== "ALL" && p.data.trade.pair !== pairFilter) return false;
    return true;
  });

  const hasActiveFilter = resultFilter !== "ALL" || pairFilter !== "ALL";

  const clearFilters = () => {
    setResultFilter("ALL");
    setPairFilter("ALL");
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
      </div>

      {/* Sort buttons */}
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

      {/* Filters row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Result filter */}
        {(["ALL", "WIN", "LOSS", "BREAKEVEN", "CANCELLED"] as ResultFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setResultFilter(f)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              resultFilter === f
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            {f === "ALL" ? "Tất cả" : f === "WIN" ? "Thắng" : f === "LOSS" ? "Thua" : f === "BREAKEVEN" ? "Hoà" : "Hủy"}
          </button>
        ))}

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

      {/* Posts */}
      {filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[40vh] gap-4">
          <FontAwesomeIcon icon={faFilter} className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-muted-foreground">
            {posts.length === 0 ? "Chưa có bài viết nào trong cộng đồng." : "Không có bài viết phù hợp filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <CommunityCard
              key={post.id}
              post={post}
              currentUserId={user?.uid}
              onImageClick={setLightboxSrc}
            />
          ))}
          {hasMore && (
            <div className="text-center py-4">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? (
                  <><FontAwesomeIcon icon={faSpinner} className="mr-2 h-4 w-4 animate-spin" />Đang tải...</>
                ) : (
                  <><FontAwesomeIcon icon={faChevronDown} className="mr-2 h-4 w-4" />Xem thêm</>
                )}
              </Button>
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
    } catch {
      setLiked(wasLiked);
      setLikeCount((c) => wasLiked ? c + 1 : c - 1);
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
    } catch {
      toast("Không thể gửi bình luận", "error");
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
    } catch {
      toast("Không thể báo cáo", "error");
    }
    setReportSubmitting(false);
  };

  const hiddenBadge = (
    <span className="text-xs text-muted-foreground italic">
      <FontAwesomeIcon icon={faEyeSlash} className="h-2.5 w-2.5 mr-0.5" />
      Ẩn
    </span>
  );

  return (
    <>
      <Card>
        <CardContent className="p-4 space-y-3">
          {/* Author header */}
          <div className="flex items-center gap-3">
            {data.ownerPhotoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.ownerPhotoURL} alt="" className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                {data.ownerDisplayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium truncate">{data.ownerDisplayName}</p>
                <RoleBadge role={data.ownerRole} />
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(data.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isOpen ? (
                <Badge className="bg-blue-500/15 text-blue-500 border-blue-500/30 text-xs">
                  <FontAwesomeIcon icon={faPlay} className="mr-1 h-2.5 w-2.5" />
                  Đang chạy
                </Badge>
              ) : (
                <Badge className="bg-green-500/15 text-green-500 border-green-500/30 text-xs">
                  <FontAwesomeIcon icon={faFlagCheckered} className="mr-1 h-2.5 w-2.5" />
                  Đã đóng
                </Badge>
              )}
            </div>
          </div>

          {/* Trade info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">{trade.pair}</span>
              <Badge className={trade.type === "BUY" ? "bg-emerald-600 text-white text-xs" : "bg-orange-600 text-white text-xs"}>
                {trade.type}
              </Badge>
              {!isOpen && (
                <span className={`font-semibold ${resultColor}`}>
                  {trade.result === "WIN" ? "Thắng" : trade.result === "LOSS" ? "Thua" : trade.result === "CANCELLED" ? "Hủy" : "Hoà"}
                </span>
              )}
            </div>
            <div className="text-right">
              {privacy.hidePnl ? hiddenBadge : (
                trade.pnl !== undefined && (
                  <span className={`font-mono font-bold ${trade.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Details row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span>{format(parseISO(trade.date), "dd/MM/yyyy")}</span>
            {trade.platform && <span>{trade.platform}</span>}
            {trade.emotion && <Badge variant="secondary" className="text-xs">{trade.emotion}</Badge>}
            {trade.timeframe && <span>TF: {trade.timeframe}</span>}
          </div>

          {/* Chart image */}
          {trade.chartImageUrl && (
            <button type="button" onClick={() => onImageClick(getImageSrc(trade.chartImageUrl!))} className="block w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getImageSrc(trade.chartImageUrl)}
                alt="Chart"
                className="rounded-lg border w-full object-contain max-h-[300px] bg-muted cursor-pointer hover:opacity-90 transition-opacity"
              />
            </button>
          )}

          {/* Note preview */}
          {trade.note && (
            <p className="text-sm text-muted-foreground line-clamp-2">{trade.note}</p>
          )}

          {/* Like & Comment & Report bar */}
          <div className="flex items-center gap-4 pt-1 border-t border-border">
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
            <a
              href={`/shared/${post.id}`}
              target="_blank"
              className="text-xs text-muted-foreground hover:text-foreground ml-auto transition-colors"
            >
              Xem chi tiết
            </a>
          </div>

          {/* Comments section */}
          {showComments && (
            <div className="space-y-3 pt-2">
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
                      {comment.photoURL ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={comment.photoURL} alt="" className="h-6 w-6 rounded-full shrink-0 mt-0.5" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                          {comment.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{comment.displayName}</span>
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
