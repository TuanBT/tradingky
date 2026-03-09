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
    const res = await fetch(`${uploadUrl}/upload/${encodeURIComponent(uid)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Không thể kết nối server upload." },
      { status: 502 }
    );
  }
}
