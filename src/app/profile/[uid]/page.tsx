"use client";

import { useEffect, useState, use, useMemo } from "react";
import { UserProfile } from "@/lib/types";
import {
  getUserProfile,
  getUserPublicTrades,
  followUser,
  unfollowUser,
  isFollowing,
  getFollowCounts,
  getFollowingList,
  getFollowersList,
  batchCheckLikes,
  FollowedUser,
  CommunityPost,
} from "@/lib/services";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui/button";
import { ImageLightbox } from "@/components/ImageLightbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TradePostCard } from "@/components/TradePostCard";
import { RoleBadge } from "@/components/RoleBadge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faUserPlus,
  faUserMinus,
  faArrowLeft,
  faClock,
  faThumbsUp,
  faComments,
} from "@fortawesome/free-solid-svg-icons";
import { format } from "date-fns";
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
  const { user, userRole } = useAuth();
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
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

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

  // Batch check likes when posts change
  useEffect(() => {
    if (!user || posts.length === 0) return;
    batchCheckLikes(user.uid, posts.map((p) => p.id)).then(setLikedPosts);
  }, [user, posts]);

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
            <RoleBadge role={profile.role} size="md" />
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
        {posts.length > 0 && <ProfileSortBar posts={posts} currentUserId={user?.uid} onImageClick={setLightboxSrc} likedPosts={likedPosts} userRole={userRole} />}
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

function ProfileSortBar({ posts, currentUserId, onImageClick, likedPosts, userRole }: { posts: CommunityPost[]; currentUserId?: string; onImageClick: (src: string) => void; likedPosts: Set<string>; userRole: import("@/lib/types").UserRole }) {
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
          <TradePostCard key={post.id} post={post} currentUserId={currentUserId} onImageClick={onImageClick} showAuthor={false} showReport={false} initialLiked={likedPosts.has(post.id)} userRole={userRole} />
        ))}
      </div>
    </div>
  );
}

