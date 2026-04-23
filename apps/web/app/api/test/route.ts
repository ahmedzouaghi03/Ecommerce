export const runtime = "nodejs";

import { db } from "@monkeyprint/db";

export async function GET() {
    try {
        const users = await db.user.findMany();

        return Response.json({
            success: true,
            count: users.length,
            data: users,
        });
    } catch (error) {
        console.error(error);
        return Response.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
    }
}