import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const matchId = searchParams.get("matchId") as Id<"matches">;
  const odaId = searchParams.get("odaId");

  if (!matchId || !odaId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    await convex.mutation(api.game.leaveMatch, { matchId, odaId });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error leaving match:", error);
    return NextResponse.json({ error: "Failed to leave match" }, { status: 500 });
  }
}

// Also handle POST for sendBeacon (which sends POST by default with body)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const matchId = body.matchId as Id<"matches">;
    const odaId = body.odaId;

    if (!matchId || !odaId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    await convex.mutation(api.game.leaveMatch, { matchId, odaId });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error leaving match:", error);
    return NextResponse.json({ error: "Failed to leave match" }, { status: 500 });
  }
}
