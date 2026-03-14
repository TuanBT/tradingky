"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { UserRole } from "@/lib/types";
import {
  getCommunityFeed,
  getCommunityFeedFollowing,
  getFollowingList,
  getUserRole,
  getSuggestedUsers,
  followUser,
  CommunityPost,
  CommunitySortMode,
  SuggestedUser,
} from "@/lib/services";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageLightbox } from "@/components/ImageLightbox";
import { TradePostCard } from "@/components/TradePostCard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHeart as faHeartSolid,
  faSpinner,
  faFilter,
  faClock,
  faThumbsUp,
  faComments,
  faXmark,
  faUserGroup,
  faGlobe,
  faUserPlus,
} from "@fortawesome/free-solid-svg-icons";
import { format } from "date-fns";
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
            <TradePostCard
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

