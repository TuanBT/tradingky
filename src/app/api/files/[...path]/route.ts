import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const uploadUrl = process.env.UPLOAD_SERVER_URL;
  if (!uploadUrl) {
    return new NextResponse("Not configured", { status: 500 });
  }

  const filePath = path.map(encodeURIComponent).join("/");
  const res = await fetch(`${uploadUrl}/files/${filePath}`, {
    headers: { Accept: request.headers.get("Accept") || "image/*" },
  });

  if (!res.ok) {
    return new NextResponse("Not found", { status: 404 });
  }

  const contentType = res.headers.get("content-type") || "image/png";
  const body = await res.arrayBuffer();

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const uploadUrl = process.env.UPLOAD_SERVER_URL;
  const apiKey = process.env.UPLOAD_API_KEY;

  if (!uploadUrl || !apiKey) {
    return NextResponse.json(
      { error: "Upload server chưa được cấu hình." },
      { status: 500 }
    );
  }

  // Allow 2 segments: uid/filename
  if (path.length !== 2) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }

  const filePath = path.map(encodeURIComponent).join("/");
  try {
    const res = await fetch(`${uploadUrl}/files/${filePath}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Không thể kết nối server upload." },
      { status: 502 }
    );
  }
}
