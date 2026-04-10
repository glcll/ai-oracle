import { NextResponse } from "next/server";
import { getResult } from "@/lib/kv";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const result = await getResult(id);

  if (!result) {
    return NextResponse.json(
      { error: "Request not found", requestId: id },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}
