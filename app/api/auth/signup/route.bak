// Auth route: mock signup — validates input and issues a session cookie.
// TODO: Replace mock user creation with Supabase auth.signUp().

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { SignupRequest, AuthResponse, User } from '@/types/auth';
import { createToken, AUTH_COOKIE, COOKIE_MAX_AGE_SEC } from '@/lib/token';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body: SignupRequest = await req.json();
    const { email, password } = body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: '유효한 이메일 주소를 입력해주세요.' },
        { status: 400 }
      );
    }
    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: '비밀번호는 8자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // ── Mock user creation ───────────────────────────────────────────────────
    // TODO: Check for duplicate email against Supabase users table.
    // TODO: Hash password with bcrypt before storing.
    const mockUser: User = {
      id: crypto.randomUUID(),
      email,
      plan: 'beta',
      usageThisMonth: 0,
      createdAt: new Date().toISOString(),
    };

    const token = createToken(mockUser.id, mockUser.email, mockUser.plan);

    // ── Issue HttpOnly session cookie ────────────────────────────────────────
    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE_SEC,
      path: '/',
    });

    const response: AuthResponse = { user: mockUser, token };
    return NextResponse.json(response, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
