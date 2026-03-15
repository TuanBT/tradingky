"use client";

import { useEffect, useState, useRef, use } from "react";
import { SharedTrade, TradeComment, UserRole } from "@/lib/types";
import {
  getSharedTrade,
  toggleLike,
  hasUserLiked,
  getComments,
  addComment,
  deleteComment,
  getUserRole,
  deleteSharedTrade,
} from "@/lib/services";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageLightbox } from "@/components/ImageLightbox";
import { TradeDetailView } from "@/components/TradeDetailView";
import { RoleBadge } from "@/components/RoleBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlay,
  faFlagCheckered,
  faArrowRight,
  faHeart as faHeartSolid,
  faComment,
  faSpinner,
  faPaperPlane,
  faTrash,
  faEllipsis,
} from "@fortawesome/free-solid-svg-icons";
import { faHeart as faHeartOutline } from "@fortawesome/free-regular-svg-icons";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import Link from "next/link";

export default function SharedTradePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { user } = useAuth();
  const { toast } = useToast();
  const [shared, setShared] = useState<SharedTrade | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState("");

  // Like/comment state
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showComments, setShowComments] = useState(true);
  const [comments, setComments] = useState<TradeComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>("user");
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [confirmDeletePost, setConfirmDeletePost] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const [visibleComments, setVisibleComments] = useState(5);
  const likeChecked = useRef(false);
  const roleChecked = useRef(false);

  useEffect(() => {
    getSharedTrade(token).then((data) => {
      if (data) {
        setShared(data);
        setLikeCount(data.likes || 0);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }).catch(() => {
      setNotFound(true);
      setLoading(false);
    });
  }, [token]);

  // Check if current user has liked
  useEffect(() => {
    if (!user?.uid || likeChecked.current) return;
    likeChecked.current = true;
    hasUserLiked(token, user.uid).then(setLiked);
  }, [user, token]);

  // Get current user's role
  useEffect(() => {
    if (!user?.uid || roleChecked.current) return;
    roleChecked.current = true;
    getUserRole(user.uid).then(setCurrentUserRole);
  }, [user]);

  // Auto-load comments for public posts
  useEffect(() => {
    if (!shared?.public) return;
    setLoadingComments(true);
    getComments(token).then(setComments).catch(() => {}).finally(() => setLoadingComments(false));
  }, [shared?.public, token]);

  const isAdminOrMod = currentUserRole === "admin" || currentUserRole === "mod";
  const isOwner = user?.uid === shared?.ownerUid;
  const canDeletePost = isOwner || isAdminOrMod;

  const handleLike = async () => {
    if (!user) {
      toast("Đăng nhập để thích bài viết", "error");
      return;
    }
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => wasLiked ? c - 1 : c + 1);
    try {
      await toggleLike(token, user.uid);
    } catch (err) {
      setLiked(wasLiked);
      setLikeCount((c) => wasLiked ? c + 1 : c - 1);
      toast((err as Error).message || "Lỗi", "error");
    }
  };

  const handleToggleComments = async () => {
    if (showComments) { setShowComments(false); return; }
    setShowComments(true);
    if (comments.length > 0) return; // Already loaded
    setLoadingComments(true);
    try {
      const result = await getComments(token);
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
      const newComment = await addComment(token, user.uid, user.displayName || "Ẩn danh", user.photoURL || undefined, commentText.trim());
      setComments((prev) => [...prev, newComment]);
      setCommentText("");
    } catch (err) {
      toast((err as Error).message || "Không thể gửi bình luận", "error");
    }
    setSubmittingComment(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(token, commentId);
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
      await deleteSharedTrade(token);
      toast("Đã xoá bài đăng", "success");
      setNotFound(true);
      setShared(null);
    } catch {
      toast("Không thể xoá bài đăng", "error");
    }
    setDeletingPost(false);
    setConfirmDeletePost(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (notFound || !shared) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4 p-4">
        <h1 className="text-2xl font-bold">Không tìm thấy lệnh</h1>
        <p className="text-muted-foreground">Link chia sẻ không tồn tại hoặc đã hết hạn.</p>
        <Button onClick={() => window.location.href = "/"}>
          <FontAwesomeIcon icon={faArrowRight} className="mr-2 h-4 w-4" />
          Về trang chủ Trading Ký
        </Button>
      </div>
    );
  }

  const { trade, ownerDisplayName, ownerPhotoURL, ownerUid, privacy } = shared;
  const isOpen = (trade.status || "CLOSED") === "OPEN";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 pb-20 space-y-6">
        {/* Shared banner */}
        <Link href={`/profile/${ownerUid}`} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
          {ownerPhotoURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ownerPhotoURL} alt="" className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium truncate">{ownerDisplayName}</p>
              {shared.ownerRole && <RoleBadge role={shared.ownerRole} size="sm" />}
            </div>
            <p className="text-xs text-muted-foreground">đã chia sẻ lệnh này từ Trading Ký</p>
          </div>
        </Link>

        {/* Trade header */}
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{trade.pair}</h1>
            <Badge className={trade.type === "BUY" ? "bg-emerald-600 text-white" : "bg-orange-600 text-white"}>
              {trade.type}
            </Badge>
            {isOpen ? (
              <Badge className="bg-blue-500/15 text-blue-500 border-blue-500/30">
                <FontAwesomeIcon icon={faPlay} className="mr-1 h-3 w-3" />
                Đang chạy
              </Badge>
            ) : (
              <Badge className="bg-green-500/15 text-green-500 border-green-500/30">
                <FontAwesomeIcon icon={faFlagCheckered} className="mr-1 h-3 w-3" />
                Đã đóng
              </Badge>
            )}
            {canDeletePost && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center justify-center h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors ml-auto">
                  <FontAwesomeIcon icon={faEllipsis} className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setConfirmDeletePost(true)}
                  >
                    <FontAwesomeIcon icon={faTrash} className="mr-2 h-3.5 w-3.5" />
                    {isOwner ? "Xoá bài đăng" : "Xoá bài đăng (Mod)"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {format(parseISO(trade.date), "EEEE, dd MMMM yyyy", { locale: vi })}
          </p>
        </div>

        <TradeDetailView trade={trade} privacy={privacy} onImageClick={(src) => setLightboxSrc(src)} />

        {/* Like & Comment section */}
        {shared.public && (
          <div className="rounded-lg border bg-card">
            {/* Like & Comment bar */}
            <div className="flex items-center gap-4 px-4 py-3">
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
                <span>{(shared.commentCount || 0) > 0 ? shared.commentCount : ""}</span>
              </button>
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
                            {(user?.uid === comment.userId || isAdminOrMod) && (
                              <button
                                onClick={() => setDeleteCommentId(comment.id)}
                                className="text-xs text-muted-foreground hover:text-destructive transition-colors ml-auto"
                                title={isAdminOrMod && user?.uid !== comment.userId ? "Xoá (Mod)" : "Xoá"}
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
          </div>
        )}

        <ConfirmDialog
          open={confirmDeletePost}
          title="Xoá bài đăng"
          message="Bài đăng sẽ bị xoá khỏi cộng đồng. Bạn chắc chắn muốn xoá?"
          variant="danger"
          confirmText={deletingPost ? "Đang xoá..." : "Xoá"}
          onConfirm={handleDeletePost}
          onClose={() => setConfirmDeletePost(false)}
        />

        <ConfirmDialog
          open={!!deleteCommentId}
          title="Xoá bình luận"
          message="Bạn chắc chắn muốn xoá bình luận này?"
          variant="danger"
          onConfirm={() => deleteCommentId && handleDeleteComment(deleteCommentId)}
          onClose={() => setDeleteCommentId(null)}
        />

        {/* CTA */}
        <div className="text-center py-4 space-y-3">
          <p className="text-sm text-muted-foreground">Ghi chép và chia sẻ giao dịch của bạn</p>
          <Button onClick={() => window.location.href = "/"} size="lg">
            Dùng Trading Ký miễn phí
            <FontAwesomeIcon icon={faArrowRight} className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <ImageLightbox
        src={lightboxSrc}
        alt="Chart"
        open={!!lightboxSrc}
        onClose={() => setLightboxSrc("")}
      />
    </div>
  );
}
