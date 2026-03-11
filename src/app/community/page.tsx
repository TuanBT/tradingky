"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { SharedTrade, TradeComment } from "@/lib/types";
import {
  getCommunityFeed,
  toggleLike,
  hasUserLiked,
  getComments,
  addComment,
  deleteComment,
  CommunityPost,
} from "@/lib/services";
import { getImageSrc } from "@/lib/gdrive";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ImageLightbox } from "@/components/ImageLightbox";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHeart as faHeartSolid,
  faComment,
  faPlay,
  faFlagCheckered,
  faImage,
  faEyeSlash,
  faSpinner,
  faPaperPlane,
  faTrash,
  faChevronDown,
  faFilter,
} from "@fortawesome/free-solid-svg-icons";
import { faHeart as faHeartOutline } from "@fortawesome/free-regular-svg-icons";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { DocumentSnapshot } from "firebase/firestore";

type ResultFilter = "ALL" | "WIN" | "LOSS";

export default function CommunityPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [resultFilter, setResultFilter] = useState<ResultFilter>("ALL");
  const [lightboxSrc, setLightboxSrc] = useState("");

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCommunityFeed(20);
      setPosts(result.posts);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch {
      toast("Không thể tải bài viết", "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await getCommunityFeed(20, lastDoc);
      setPosts((prev) => [...prev, ...result.posts]);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch {
      toast("Không thể tải thêm", "error");
    }
    setLoadingMore(false);
  };

  const filteredPosts = posts.filter((p) => {
    if (resultFilter === "ALL") return true;
    return p.data.trade.result === resultFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Cộng đồng</h1>
        <div className="flex items-center gap-1 rounded-lg border border-border overflow-hidden">
          {(["ALL", "WIN", "LOSS"] as ResultFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setResultFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                resultFilter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-accent"
              }`}
            >
              {f === "ALL" ? "Tất cả" : f === "WIN" ? "Thắng" : "Thua"}
            </button>
          ))}
        </div>
      </div>

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
  const resultColor = trade.result === "WIN" ? "text-green-500" : trade.result === "LOSS" ? "text-red-500" : "text-yellow-500";

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(data.likes || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<TradeComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const likeChecked = useRef(false);

  // Check if current user has liked
  useEffect(() => {
    if (!currentUserId || likeChecked.current) return;
    likeChecked.current = true;
    hasUserLiked(post.id, currentUserId).then(setLiked);
  }, [currentUserId, post.id]);

  const handleLike = async () => {
    if (!currentUserId) {
      toast("Đăng nhập để thích bài viết", "error");
      return;
    }
    // Optimistic update
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
    } catch {
      toast("Không thể xoá bình luận", "error");
    }
  };

  const hiddenBadge = (
    <span className="text-xs text-muted-foreground italic">
      <FontAwesomeIcon icon={faEyeSlash} className="h-2.5 w-2.5 mr-0.5" />
      Ẩn
    </span>
  );

  return (
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
            <p className="text-sm font-medium truncate">{data.ownerDisplayName}</p>
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
                {trade.result === "WIN" ? "Thắng" : trade.result === "LOSS" ? "Thua" : "Hoà"}
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

        {/* Like & Comment bar */}
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
                        {currentUserId === comment.userId && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-xs text-muted-foreground hover:text-destructive transition-colors ml-auto"
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
  );
}
