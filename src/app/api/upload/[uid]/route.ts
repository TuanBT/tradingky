import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params;
  const uploadUrl = process.env.UPLOAD_SERVER_URL;
  const apiKey = process.env.UPLOAD_API_KEY;

  if (!uploadUrl || !apiKey) {
    return NextResponse.json(
      { error: "Upload server chưa được cấu hình." },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    // Pass tradeId query param to VPS for folder organization
    const tradeId = request.nextUrl.searchParams.get("tradeId") || "";
    const vpsUrl = new URL(`/upload/${encodeURIComponent(uid)}`, uploadUrl);
    if (tradeId) {
      vpsUrl.searchParams.set("tradeId", tradeId);
    }

    const res = await fetch(vpsUrl.toString(), {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    // Convert VPS URL to proxy URL (HTTPS-safe)
    // VPS returns: http://ip:port/files/uid/tradeId/filename.png
    // Proxy URL:   /api/files/uid/tradeId/filename.png
    const vpsFileUrl: string = data.url || "";
    const filesIdx = vpsFileUrl.indexOf("/files/");
    const proxyUrl = filesIdx >= 0
      ? `/api${vpsFileUrl.slice(filesIdx)}`
      : vpsFileUrl;
    return NextResponse.json({ url: proxyUrl });
  } catch {
    return NextResponse.json(
      { error: "Không thể kết nối server upload." },
      { status: 502 }
    );
  }
}
