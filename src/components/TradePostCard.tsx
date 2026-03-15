"use client";

import { useEffect, useState } from "react";
import { TradeComment, UserRole, getTradeImages } from "@/lib/types";
import {
  toggleLike,
  getComments,
  addComment,
  deleteComment,
  reportPost,
  deleteSharedTrade,
  CommunityPost,
} from "@/lib/services";
import { getImageSrc } from "@/lib/gdrive";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { RoleBadge } from "@/components/RoleBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHeart as faHeartSolid,
  faComment,
  faPlay,
  faFlagCheckered,
  faSpinner,
  faPaperPlane,
  faTrash,
  faFlag,
  faBuildingColumns,
  faEllipsis,
  faArrowUpRightFromSquare,
} from "@fortawesome/free-solid-svg-icons";
import { faHeart as faHeartOutline } from "@fortawesome/free-regular-svg-icons";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import Link from "next/link";

interface TradePostCardProps {
  post: CommunityPost;
  currentUserId?: string;
  onImageClick: (images: string[], index: number) => void;
  /** Show author row with avatar/name. Default: true (community), false for profile page */
  showAuthor?: boolean;
  /** Enable report button. Default: true */
  showReport?: boolean;
  /** Pre-computed: has user liked this post? Avoids per-card Firestore read */
  initialLiked?: boolean;
  /** Pre-computed: current user role. Avoids per-card Firestore read */
  userRole?: UserRole;
  /** Called after post is deleted (owner/admin/mod) */
  onDeletePost?: (postId: string) => void;
}

export function TradePostCard({
  post,
  currentUserId,
  onImageClick,
  showAuthor = true,
  showReport = true,
  initialLiked = false,
  userRole: propUserRole,
  onDeletePost,
}: TradePostCardProps) {
  const { user, userRole: authUserRole } = useAuth();
  const { toast } = useToast();
  const { data } = post;
  const { trade, privacy } = data;
  const isOpen = (trade.status || "CLOSED") === "OPEN";
  const resultColor = trade.result === "WIN" ? "text-green-500" : trade.result === "LOSS" ? "text-red-500" : trade.result === "CANCELLED" ? "text-gray-500" : "text-yellow-500";

  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(data.likes || 0);
  const [showComments, setShowComments] = useState(true);
  const [comments, setComments] = useState<TradeComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);
  const [confirmDeletePost, setConfirmDeletePost] = useState(false);
  const [visibleComments, setVisibleComments] = useState(5);

  // Use prop role if provided, otherwise fall back to auth context role
  const currentUserRole = propUserRole ?? authUserRole;
  const isAdminOrMod = currentUserRole === "admin" || currentUserRole === "mod";
  const isOwner = currentUserId === data.ownerUid;
  const canDeletePost = isOwner || isAdminOrMod;

  // Sync initialLiked prop when it changes (e.g. batch check completes)
  useEffect(() => {
    setLiked(initialLiked);
  }, [initialLiked]);

  // Auto-load comments on mount
  useEffect(() => {
    setLoadingComments(true);
    getComments(post.id).then(setComments).catch(() => {}).finally(() => setLoadingComments(false));
  }, [post.id]);

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
    if (comments.length > 0) return; // Already loaded
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

  const handleDeletePost = async () => {
    setDeletingPost(true);
    try {
      await deleteSharedTrade(post.id);
      toast("Đã xoá bài đăng", "success");
      onDeletePost?.(post.id);
    } catch {
      toast("Không thể xoá bài đăng", "error");
    }
    setDeletingPost(false);
    setConfirmDeletePost(false);
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
            {showAuthor ? (
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
            ) : (
              /* Compact meta row for profile page (no author) */
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span>{format(parseISO(trade.date), "dd/MM/yyyy")}</span>
                {trade.platform && <span>{trade.platform}</span>}
                {trade.emotion && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{trade.emotion}</Badge>}
                {trade.timeframe && <span>TF: {trade.timeframe}</span>}
              </div>
            )}

            {/* Chart images */}
            {(() => {
              const images = getTradeImages(trade);
              if (images.length === 0) return null;
              const imageSrcs = images.map(getImageSrc);
              return (
                <div className={`grid gap-1 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                  {imageSrcs.map((src, i) => (
                    <button key={i} type="button" onClick={() => onImageClick(imageSrcs, i)} className="block w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`Chart ${i + 1}`}
                        loading="lazy"
                        className={`rounded-lg border w-full object-contain bg-muted cursor-pointer hover:opacity-90 transition-opacity ${images.length === 1 ? "max-h-[280px]" : "max-h-[180px]"}`}
                      />
                    </button>
                  ))}
                </div>
              );
            })()}

            {/* Note preview */}
            {trade.note && (
              <p className="text-sm text-muted-foreground line-clamp-2">{trade.note}</p>
            )}

            {/* Details tags (only when showing author — community view) */}
            {showAuthor && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <span>{format(parseISO(trade.date), "dd/MM/yyyy")}</span>
                {trade.emotion && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{trade.emotion}</Badge>}
              </div>
            )}

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
              {showReport && currentUserId && currentUserId !== data.ownerUid && !canDeletePost && (
                <button
                  onClick={() => setShowReportDialog(true)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-orange-500 transition-colors"
                  title="Báo cáo"
                >
                  <FontAwesomeIcon icon={faFlag} className="h-3.5 w-3.5" />
                </button>
              )}
              {/* ... dropdown menu for actions */}
              {(canDeletePost || (showReport && currentUserId && currentUserId !== data.ownerUid)) ? (
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center justify-center h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors ml-auto">
                    <FontAwesomeIcon icon={faEllipsis} className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="bottom">
                    <DropdownMenuItem onClick={() => window.open(`/shared/${post.id}`, '_blank')}>
                      <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="h-3.5 w-3.5" />
                      Xem chi tiết
                    </DropdownMenuItem>
                    {showReport && currentUserId && currentUserId !== data.ownerUid && (
                      <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
                        <FontAwesomeIcon icon={faFlag} className="h-3.5 w-3.5" />
                        Báo cáo
                      </DropdownMenuItem>
                    )}
                    {canDeletePost && (
                      <DropdownMenuItem variant="destructive" onClick={() => setConfirmDeletePost(true)}>
                        <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                        {isOwner ? "Xoá bài đăng" : "Xoá bài đăng (Mod)"}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  href={`/shared/${post.id}`}
                  target="_blank"
                  className="text-xs text-muted-foreground hover:text-foreground ml-auto transition-colors"
                >
                  Xem chi tiết
                </Link>
              )}
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
                  {comments.slice(0, visibleComments).map((comment) => (
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
                  {comments.length > visibleComments && (
                    <button
                      onClick={() => setVisibleComments((v) => v + 10)}
                      className="text-sm text-primary hover:underline text-center w-full py-1"
                    >
                      Xem thêm {comments.length - visibleComments} bình luận
                    </button>
                  )}
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

      {/* Delete post confirmation */}
      <ConfirmDialog
        open={confirmDeletePost}
        title="Xoá bài đăng"
        message={isOwner
          ? "Bạn chắc chắn muốn xoá bài đăng này? Tất cả likes và comments sẽ bị xoá vĩnh viễn."
          : "Bạn chắc chắn muốn xoá bài đăng này vì vi phạm nguyên tắc cộng đồng?"}
        variant="danger"
        onConfirm={handleDeletePost}
        onClose={() => setConfirmDeletePost(false)}
      />
    </>
  );
}
