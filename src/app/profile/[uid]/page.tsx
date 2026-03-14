"use client";

import { useEffect, useState, useRef, use, useMemo } from "react";
import { UserProfile, TradeComment, UserRole } from "@/lib/types";
import {
  getUserProfile,
  getUserPublicTrades,
  followUser,
  unfollowUser,
  isFollowing,
  getFollowCounts,
  getFollowingList,
  getFollowersList,
  FollowedUser,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHeart as faHeartSolid,
  faComment,
  faPlay,
  faFlagCheckered,
  faSpinner,
  faPaperPlane,
  faTrash,
  faUserPlus,
  faUserMinus,
  faCrown,
  faUserShield,
  faArrowLeft,
  faClock,
  faThumbsUp,
  faComments,
} from "@fortawesome/free-solid-svg-icons";
import { faHeart as faHeartOutline } from "@fortawesome/free-regular-svg-icons";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import Link from "next/link";

type ProfileSortMode = "newest" | "topLikes" | "topComments";

const PROFILE_SORT_OPTIONS: { mode: ProfileSortMode; label: string; icon: typeof faClock }[] = [
  { mode: "newest", label: "Mới nhất", icon: faClock },
  { mode: "topLikes", label: "Top like", icon: faThumbsUp },
  { mode: "topComments", label: "Top bình luận", icon: faComments },
];

export default function ProfilePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = use(params);
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState("");
  const [followCounts, setFollowCounts] = useState({ following: 0, followers: 0 });
  const [showFollowList, setShowFollowList] = useState<"following" | "followers" | null>(null);
  const [followListUsers, setFollowListUsers] = useState<(FollowedUser & { profile?: UserProfile })[]>([]);
  const [followListLoading, setFollowListLoading] = useState(false);

  const isOwnProfile = user?.uid === uid;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [prof, trades, counts] = await Promise.all([
          getUserProfile(uid),
          getUserPublicTrades(uid),
          getFollowCounts(uid),
        ]);
        setProfile(prof);
        setPosts(trades);
        setFollowCounts(counts);
        if (user && user.uid !== uid) {
          const f = await isFollowing(user.uid, uid);
          setFollowing(f);
        }
      } catch {
        toast("Không thể tải trang cá nhân", "error");
      }
      setLoading(false);
    }
    load();
  }, [uid, user, toast]);

  const handleToggleFollow = async () => {
    if (!user) {
      toast("Đăng nhập để theo dõi", "error");
      return;
    }
    setFollowLoading(true);
    try {
      if (following) {
        await unfollowUser(user.uid, uid);
        setFollowing(false);
        setFollowCounts((c) => ({ ...c, followers: Math.max(0, c.followers - 1) }));
        toast("Đã bỏ theo dõi", "success");
      } else {
        await followUser(user.uid, uid);
        setFollowing(true);
        setFollowCounts((c) => ({ ...c, followers: c.followers + 1 }));
        toast("Đang theo dõi", "success");
      }
    } catch {
      toast("Không thể thực hiện", "error");
    }
    setFollowLoading(false);
  };

  const openFollowList = async (type: "following" | "followers") => {
    setShowFollowList(type);
    setFollowListLoading(true);
    setFollowListUsers([]);
    try {
      const list = type === "following" ? await getFollowingList(uid) : await getFollowersList(uid);
      // Fetch profiles for each user
      const withProfiles = await Promise.all(
        list.map(async (fu) => {
          try {
            const prof = await getUserProfile(fu.uid);
            return { ...fu, profile: prof ?? undefined };
          } catch {
            return fu;
          }
        })
      );
      setFollowListUsers(withProfiles);
    } catch {
      toast("Không thể tải danh sách", "error");
    }
    setFollowListLoading(false);
  };

  // Compute stats from public posts
  const stats = {
    totalTrades: posts.length,
    wins: posts.filter((p) => p.data.trade.result === "WIN").length,
    losses: posts.filter((p) => p.data.trade.result === "LOSS").length,
    totalLikes: posts.reduce((sum, p) => sum + (p.data.likes || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <p className="text-muted-foreground">Không tìm thấy người dùng.</p>
        <Link href="/community">
          <Button variant="outline">
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2 h-4 w-4" />
            Quay lại Cộng đồng
          </Button>
        </Link>
      </div>
    );
  }

  const roleBadge =
    profile.role === "admin" ? (
      <FontAwesomeIcon icon={faCrown} className="h-4 w-4 text-yellow-500" title="Admin" />
    ) : profile.role === "mod" ? (
      <FontAwesomeIcon icon={faUserShield} className="h-4 w-4 text-blue-500" title="Mod" />
    ) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <Link href="/community" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" />
        Quay lại Cộng đồng
      </Link>

      {/* Profile header */}
      <div className="flex items-center gap-4">
        {profile.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.photoURL} alt="" className="h-16 w-16 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-xl font-bold">
            {(profile.displayName || "?").charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold truncate">{profile.displayName || "Ẩn danh"}</h1>
            {roleBadge}
          </div>
          <p className="text-sm text-muted-foreground">
            Tham gia từ {profile.createdAt ? format(new Date(profile.createdAt), "MM/yyyy", { locale: vi }) : "N/A"}
          </p>
        </div>
        {!isOwnProfile && user && (
          <Button
            variant={following ? "outline" : "default"}
            size="sm"
            onClick={handleToggleFollow}
            disabled={followLoading}
          >
            {followLoading ? (
              <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" />
            ) : following ? (
              <><FontAwesomeIcon icon={faUserMinus} className="mr-1.5 h-3.5 w-3.5" />Bỏ theo dõi</>
            ) : (
              <><FontAwesomeIcon icon={faUserPlus} className="mr-1.5 h-3.5 w-3.5" />Theo dõi</>
            )}
          </Button>
        )}
      </div>

      {/* Follow counts */}
      <div className="flex items-center gap-4">
        <button onClick={() => openFollowList("followers")} className="hover:underline">
          <span className="font-bold">{followCounts.followers}</span>{" "}
          <span className="text-sm text-muted-foreground">Người theo dõi</span>
        </button>
        <button onClick={() => openFollowList("following")} className="hover:underline">
          <span className="font-bold">{followCounts.following}</span>{" "}
          <span className="text-sm text-muted-foreground">Đang theo dõi</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="text-center p-3 rounded-lg border bg-card">
          <p className="text-lg font-bold">{stats.totalTrades}</p>
          <p className="text-xs text-muted-foreground">Lệnh</p>
        </div>
        <div className="text-center p-3 rounded-lg border bg-card">
          <p className="text-lg font-bold text-green-500">{stats.wins}</p>
          <p className="text-xs text-muted-foreground">Thắng</p>
        </div>
        <div className="text-center p-3 rounded-lg border bg-card">
          <p className="text-lg font-bold text-red-500">{stats.losses}</p>
          <p className="text-xs text-muted-foreground">Thua</p>
        </div>
        <div className="text-center p-3 rounded-lg border bg-card">
          <p className="text-lg font-bold text-pink-500">{stats.totalLikes}</p>
          <p className="text-xs text-muted-foreground">Likes</p>
        </div>
      </div>

      {/* Posts list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Lệnh đã chia sẻ ({posts.length})</h2>
        </div>
        {posts.length > 0 && <ProfileSortBar posts={posts} currentUserId={user?.uid} onImageClick={setLightboxSrc} />}
        {posts.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Chưa có lệnh nào được chia sẻ.</p>
        )}
      </div>

      {/* Follow list dialog */}
      <Dialog open={!!showFollowList} onOpenChange={(open) => !open && setShowFollowList(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{showFollowList === "followers" ? "Người theo dõi" : "Đang theo dõi"}</DialogTitle>
          </DialogHeader>
          {followListLoading ? (
            <div className="flex justify-center py-8">
              <FontAwesomeIcon icon={faSpinner} className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : followListUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {showFollowList === "followers" ? "Chưa có ai theo dõi." : "Chưa theo dõi ai."}
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {followListUsers.map((fu) => (
                <Link
                  key={fu.uid}
                  href={`/profile/${fu.uid}`}
                  onClick={() => setShowFollowList(null)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  {fu.profile?.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fu.profile.photoURL} alt="" className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                      {(fu.profile?.displayName || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-medium truncate">{fu.profile?.displayName || "Ẩn danh"}</span>
                </Link>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ImageLightbox
        src={lightboxSrc}
        alt="Chart"
        open={!!lightboxSrc}
        onClose={() => setLightboxSrc("")}
      />
    </div>
  );
}

function ProfileSortBar({ posts, currentUserId, onImageClick }: { posts: CommunityPost[]; currentUserId?: string; onImageClick: (src: string) => void }) {
  const [sortMode, setSortMode] = useState<ProfileSortMode>("newest");

  const sortedPosts = useMemo(() => {
    const sorted = [...posts];
    switch (sortMode) {
      case "topLikes":
        return sorted.sort((a, b) => (b.data.likes || 0) - (a.data.likes || 0));
      case "topComments":
        return sorted.sort((a, b) => (b.data.commentCount || 0) - (a.data.commentCount || 0));
      default:
        return sorted.sort((a, b) => b.data.createdAt - a.data.createdAt);
    }
  }, [posts, sortMode]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {PROFILE_SORT_OPTIONS.map((opt) => (
          <button
            key={opt.mode}
            onClick={() => setSortMode(opt.mode)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              sortMode === opt.mode
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            <FontAwesomeIcon icon={opt.icon} className="h-2.5 w-2.5" />
            {opt.label}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {sortedPosts.map((post) => (
          <ProfilePostCard key={post.id} post={post} currentUserId={currentUserId} onImageClick={onImageClick} />
        ))}
      </div>
    </div>
  );
}

function ProfilePostCard({
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
  const likeChecked = useRef(false);

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
    if (showComments) { setShowComments(false); return; }
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
      const newComment = await addComment(post.id, user.uid, user.displayName || "Ẩn danh", user.photoURL || undefined, commentText.trim());
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

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {/* Trade info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">{trade.pair}</span>
            <Badge className={trade.type === "BUY" ? "bg-emerald-600 text-white text-xs" : "bg-orange-600 text-white text-xs"}>
              {trade.type}
            </Badge>
            {isOpen ? (
              <Badge className="bg-blue-500/15 text-blue-500 border-blue-500/30 text-xs">
                <FontAwesomeIcon icon={faPlay} className="mr-1 h-2.5 w-2.5" />
                OPEN
              </Badge>
            ) : (
              <span className={`font-semibold ${resultColor}`}>
                {trade.result === "WIN" ? "Thắng" : trade.result === "LOSS" ? "Thua" : trade.result === "CANCELLED" ? "Hủy" : "Hoà"}
              </span>
            )}
          </div>
          <div className="text-right">
            {!privacy.hidePnl && trade.pnl !== undefined && (
              <span className={`font-mono font-bold ${trade.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
              </span>
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

        {trade.note && <p className="text-sm text-muted-foreground line-clamp-2">{trade.note}</p>}

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
          <a href={`/shared/${post.id}`} target="_blank" className="text-xs text-muted-foreground hover:text-foreground ml-auto transition-colors">
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
                {comments.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Chưa có bình luận nào.</p>}
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
                        <span className="text-xs text-muted-foreground">{format(new Date(comment.createdAt), "dd/MM HH:mm")}</span>
                        {currentUserId === comment.userId && (
                          <button onClick={() => handleDeleteComment(comment.id)} className="text-xs text-muted-foreground hover:text-destructive transition-colors ml-auto">
                            <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm">{comment.text}</p>
                    </div>
                  </div>
                ))}
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
                    <Button size="icon" variant="ghost" onClick={handleSubmitComment} disabled={!commentText.trim() || submittingComment}>
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
