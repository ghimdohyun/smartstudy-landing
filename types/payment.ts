// Payment domain types — designed for TossPayments integration (Phase 5+)

import type { PlanTier } from './auth';

// ─── Payment status (mirrors TossPayments status field) ───────────────────────

export type PaymentStatus =
  | 'PENDING'    // 결제 대기
  | 'DONE'       // 결제 완료
  | 'CANCELED'   // 취소됨
  | 'FAILED'     // 실패
  | 'ABORTED';   // 인증 전 취소

// ─── Payment record ───────────────────────────────────────────────────────────

/** A single payment transaction (stored in DB payments table) */
export interface Payment {
  /** UUID from DB */
  id: string;
  /** TossPayments paymentKey — unique per transaction */
  paymentKey: string;
  /** Merchant order ID generated before checkout */
  orderId: string;
  /** Charged amount in KRW */
  amount: number;
  status: PaymentStatus;
  plan: PlanTier;
  userId: string;
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 — set when status changes to DONE */
  approvedAt?: string;
}

// ─── API request shapes ───────────────────────────────────────────────────────

/** Body sent to /api/payment/confirm after TossPayments redirect */
export interface PaymentConfirmRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

/** Body sent to /api/payment/initiate to start a checkout session */
export interface PaymentInitiateRequest {
  plan: PlanTier;
}

/** Response from /api/payment/initiate */
export interface PaymentInitiateResponse {
  orderId: string;
  amount: number;
  orderName: string;
}
