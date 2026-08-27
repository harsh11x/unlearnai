import { NextRequest, NextResponse } from "next/server";
import { createUser, findUserByEmail } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (!/[A-Z]/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain at least one uppercase letter." },
        { status: 400 }
      );
    }

    if (!/\d/.test(password)) {
      return NextResponse.json(
        { error: "Password must contain at least one number." },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = findUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists." },
        { status: 409 }
      );
    }

    // Create user
    const user = await createUser(name, email, password);

    return NextResponse.json(
      {
        message: "Account created successfully.",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
