#!/bin/bash
# deploy.command — Build, bump version, tag, and push to current branch
# Double-click this file in Finder to run it.

cd "$(dirname "$0")" || exit 1
echo "📁 Working in: $(pwd)"
echo ""

# Get current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "🌿 Branch: $BRANCH"

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "⚠️  Có thay đổi chưa commit. Commit trước khi deploy."
  echo ""
  git status --short
  echo ""
  read -rp "Nhập commit message: " MSG
  if [ -z "$MSG" ]; then
    echo "❌ Không có commit message. Huỷ."
    exit 1
  fi
  git add -A
  git commit -m "$MSG"
  echo ""
fi

# Build
echo "🔨 Building..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build thất bại. Huỷ deploy."
  exit 1
fi
echo "✅ Build thành công!"
echo ""

# Read current version
CURRENT=$(node -p "require('./package.json').version")
echo "📌 Version hiện tại: $CURRENT"

# Ask for version bump type
echo ""
echo "Chọn kiểu bump version:"
echo "  1) patch  (0.1.0 → 0.1.1)"
echo "  2) minor  (0.1.0 → 0.2.0)"
echo "  3) major  (0.1.0 → 1.0.0)"
echo "  4) Giữ nguyên version"
read -rp "Chọn (1/2/3/4): " CHOICE

case $CHOICE in
  1) BUMP="patch" ;;
  2) BUMP="minor" ;;
  3) BUMP="major" ;;
  4) BUMP="" ;;
  *) echo "❌ Lựa chọn không hợp lệ."; exit 1 ;;
esac

if [ -n "$BUMP" ]; then
  # Bump version (--no-git-tag-version so we control the tag)
  npm version "$BUMP" --no-git-tag-version
  NEW_VERSION=$(node -p "require('./package.json').version")
  echo "📦 Version mới: $NEW_VERSION"

  # Commit version bump
  git add package.json package-lock.json 2>/dev/null
  git commit -m "chore: bump version to v$NEW_VERSION"
else
  NEW_VERSION="$CURRENT"
  echo "📦 Giữ version: $NEW_VERSION"
fi

# Create git tag
TAG="v$NEW_VERSION"
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "⚠️  Tag $TAG đã tồn tại, bỏ qua tạo tag."
else
  git tag -a "$TAG" -m "Release $TAG"
  echo "🏷️  Đã tạo tag: $TAG"
fi

# Push
echo ""
echo "🚀 Pushing to $BRANCH..."
git push origin "$BRANCH" --tags
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Deploy thành công!"
  echo "   Branch: $BRANCH"
  echo "   Version: $NEW_VERSION"
  echo "   Tag: $TAG"
else
  echo "❌ Push thất bại."
  exit 1
fi

echo ""
read -rp "Nhấn Enter để đóng..."
