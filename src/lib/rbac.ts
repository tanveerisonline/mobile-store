/* ------------------------------------------------------------------ */
/*  Role-based access control: permission matrix + enforcement.        */
/*  Enforced in the service layer (server-side equivalent) AND the UI. */
/* ------------------------------------------------------------------ */

import type { Role, User } from "../types";
import { logger } from "./logger";

export const PERMS = {
  DASH: "dashboard.view",
  PROD_R: "products.read",
  PROD_W: "products.write",
  CAT_W: "categories.write",
  ORDER_R: "orders.read",
  ORDER_W: "orders.update",
  SLIDE_W: "sliders.write",
  COUPON_W: "coupons.write",
  USERS: "users.manage",
  SETTINGS: "settings.manage",
  AUDIT: "audit.read",
} as const;

export type Perm = (typeof PERMS)[keyof typeof PERMS];

const ALL_PERMS = Object.values(PERMS);

export const ROLE_PERMS: Record<Role, Perm[]> = {
  admin: ALL_PERMS,
  editor: [
    PERMS.DASH,
    PERMS.PROD_R,
    PERMS.PROD_W,
    PERMS.CAT_W,
    PERMS.ORDER_R,
    PERMS.ORDER_W,
    PERMS.SLIDE_W,
    PERMS.COUPON_W,
    PERMS.AUDIT,
  ],
  viewer: [PERMS.DASH, PERMS.PROD_R, PERMS.ORDER_R],
  customer: [],
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrator",
  editor: "Editor",
  viewer: "Viewer",
  customer: "Customer",
};

export const ROLE_TONE: Record<Role, "volt" | "gold" | "mist" | "tang"> = {
  admin: "tang",
  editor: "volt",
  viewer: "gold",
  customer: "mist",
};

export function can(role: Role | undefined | null, perm: Perm): boolean {
  if (!role) return false;
  return (ROLE_PERMS[role] ?? []).includes(perm);
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}

/** Service-layer guard — throws (and audit-logs) on denial. */
export function requirePerm(user: User | null, perm: Perm): asserts user is User {
  if (!user) {
    logger.security("AUTH_MISSING", "anonymous", `missing session for ${perm}`);
    throw new AuthError("Authentication required", 401);
  }
  if (!can(user.role, perm)) {
    logger.security("ACCESS_DENIED", user.email, `${user.role} attempted ${perm}`);
    throw new AuthError(`Forbidden — ${ROLE_LABEL[user.role]} cannot perform "${perm}"`);
  }
}

export function requireAuth(user: User | null): asserts user is User {
  if (!user) {
    logger.security("AUTH_MISSING", "anonymous", "action requires login");
    throw new AuthError("Please sign in to continue", 401);
  }
}
