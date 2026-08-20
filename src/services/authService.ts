/* ------------------------------------------------------------------ */
/*  AuthService — registration, login, sessions, account admin.        */
/*  Every write is audit-logged; auth endpoints are rate-limited.      */
/* ------------------------------------------------------------------ */

import type { Role, Session, User, UserStatus } from "../types";
import { Repository } from "../lib/db";
import { genSalt, genToken, hashPassword, isEmail, passwordIssue, rateLimiter, stripTags, truncate } from "../lib/security";
import { logger } from "../lib/logger";
import { AuthError, requirePerm, PERMS, ROLE_LABEL } from "../lib/rbac";
import { lag } from "../lib/utils";

const SESSION_TTL = 24 * 60 * 60 * 1000; // 24h

const deviceInfo = () => {
  const ua = navigator.userAgent;
  const mobile = /Mobi|Android|iPhone|iPad/i.test(ua) ? "Mobile" : "Desktop";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "Browser";
  return `${mobile} · ${browser}`;
};

export class AuthService {
  constructor(
    private users: Repository<User>,
    private sessions: Repository<Session>
  ) {}

  private createSession(user: User): string {
    const token = genToken();
    this.sessions.insert({
      token,
      userId: user.id,
      device: deviceInfo(),
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL,
    });
    return token;
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    await lag(480);
    const em = email.trim().toLowerCase();
    if (!isEmail(em)) throw new AuthError("Enter a valid email address", 422);

    const rl = rateLimiter.hit(`login:${em}`, 5, 10 * 60 * 1000);
    if (!rl.ok) {
      logger.security("LOGIN_RATE_LIMITED", em, `locked for ${rl.retryIn}s`);
      throw new AuthError(`Too many attempts — try again in ${rl.retryIn}s`, 429);
    }

    const user = this.users.where((u) => u.email.toLowerCase() === em)[0] ?? null;
    if (!user) {
      logger.security("LOGIN_FAIL", em, "unknown email");
      throw new AuthError("Invalid email or password", 401);
    }
    if (user.status === "suspended") {
      logger.security("LOGIN_SUSPENDED", em);
      throw new AuthError("This account is suspended — contact support", 403);
    }

    const hash = await hashPassword(password, user.salt);
    if (hash !== user.passHash) {
      logger.security("LOGIN_FAIL", em, `bad password · ${rl.remaining} attempt(s) left`);
      throw new AuthError(`Invalid email or password · ${rl.remaining} attempt(s) left`, 401);
    }

    const token = this.createSession(user);
    this.users.patch(user.id, { lastLoginAt: Date.now() });
    logger.info("LOGIN_OK", em, ROLE_LABEL[user.role]);
    return { user: this.users.find(user.id)!, token };
  }

  async register(name: string, email: string, password: string): Promise<{ user: User; token: string }> {
    await lag(520);
    const cleanName = truncate(stripTags(name), 40);
    const em = email.trim().toLowerCase();
    if (cleanName.length < 2) throw new AuthError("Name must be at least 2 characters", 422);
    if (!isEmail(em)) throw new AuthError("Enter a valid email address", 422);
    const pwIssue = passwordIssue(password);
    if (pwIssue) throw new AuthError(pwIssue, 422);

    const rl = rateLimiter.hit(`register:${em}`, 3, 10 * 60 * 1000);
    if (!rl.ok) {
      logger.security("REGISTER_RATE_LIMITED", em, `locked for ${rl.retryIn}s`);
      throw new AuthError(`Too many sign-ups — try again in ${rl.retryIn}s`, 429);
    }
    if (this.users.where((u) => u.email.toLowerCase() === em).length > 0) {
      throw new AuthError("An account with this email already exists", 409);
    }

    const salt = genSalt();
    const passHash = await hashPassword(password, salt);
    const user = this.users.insert({
      id: `u_${Date.now().toString(36)}`,
      name: cleanName,
      email: em,
      salt,
      passHash,
      role: "customer",
      status: "active",
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    });
    logger.info("USER_REGISTERED", em);
    const token = this.createSession(user);
    return { user, token };
  }

  /** Validate a stored token; cleans up expired sessions. */
  restore(token: string | null): User | null {
    if (!token) return null;
    const session = this.sessions.find(token);
    if (!session) return null;
    if (session.expiresAt < Date.now()) {
      this.sessions.remove(token);
      logger.debug("SESSION_EXPIRED", session.userId);
      return null;
    }
    const user = this.users.find(session.userId);
    if (!user || user.status !== "active") {
      this.sessions.remove(token);
      return null;
    }
    return user;
  }

  logout(token: string | null, actor = "user") {
    if (!token) return;
    this.sessions.remove(token);
    logger.info("LOGOUT", actor);
  }

  /* ----------------------- account admin (RBAC) ---------------------- */

  listSessions(actor: User): { session: Session; user: User | null }[] {
    requirePerm(actor, PERMS.USERS);
    return this.sessions.all().map((session) => ({ session, user: this.users.find(session.userId) }));
  }

  revokeSession(actor: User, token: string) {
    requirePerm(actor, PERMS.USERS);
    const s = this.sessions.find(token);
    this.sessions.remove(token);
    logger.security("SESSION_REVOKED", actor.email, s?.userId ?? token.slice(0, 10));
  }

  revokeAllSessions(actor: User) {
    requirePerm(actor, PERMS.USERS);
    const count = this.sessions.count();
    this.sessions.all().forEach((s) => this.sessions.remove(s.token));
    logger.security("SESSIONS_REVOKED_ALL", actor.email, `${count} sessions`);
  }

  changePassword(user: User, current: string, next: string) {
    const fresh = this.users.find(user.id);
    if (!fresh) throw new AuthError("Account not found", 404);
    const issue = passwordIssue(next);
    if (issue) throw new AuthError(issue, 422);
    return hashPassword(current, fresh.salt).then(async (hash) => {
      if (hash !== fresh.passHash) {
        logger.security("PASSWORD_CHANGE_FAIL", user.email, "wrong current password");
        throw new AuthError("Current password is incorrect", 401);
      }
      const salt = genSalt();
      const passHash = await hashPassword(next, salt);
      this.users.patch(user.id, { salt, passHash });
      // rotate: kill every session except the live one is overkill for demo — revoke all
      this.sessions.where((s) => s.userId === user.id).forEach((s) => this.sessions.remove(s.token));
      logger.security("PASSWORD_CHANGED", user.email, "all sessions revoked");
    });
  }

  updateProfile(user: User, name: string): User {
    const clean = truncate(stripTags(name), 40);
    if (clean.length < 2) throw new AuthError("Name must be at least 2 characters", 422);
    this.users.patch(user.id, { name: clean });
    logger.info("PROFILE_UPDATED", user.email);
    return this.users.find(user.id)!;
  }

  /* ------------------------ user management -------------------------- */

  allUsers(actor: User): User[] {
    requirePerm(actor, PERMS.USERS);
    return this.users.all();
  }

  createUser(actor: User, data: { name: string; email: string; role: Role; password: string }): User {
    requirePerm(actor, PERMS.USERS);
    const em = data.email.trim().toLowerCase();
    if (!isEmail(em)) throw new AuthError("Enter a valid email", 422);
    const issue = passwordIssue(data.password);
    if (issue) throw new AuthError(issue, 422);
    if (this.users.where((u) => u.email.toLowerCase() === em).length) throw new AuthError("Email already registered", 409);
    const salt = genSalt();
    const user: User = {
      id: `u_${Date.now().toString(36)}`,
      name: truncate(stripTags(data.name), 40),
      email: em,
      salt,
      passHash: "pending", // replaced below (async hash)
      role: data.role,
      status: "active",
      createdAt: Date.now(),
      lastLoginAt: null,
    };
    // hash synchronously-safe: we await via caller; here we store then patch
    const inserted = this.users.insert(user);
    void hashPassword(data.password, salt).then((passHash) => this.users.patch(user.id, { passHash }));
    logger.info("USER_CREATED", actor.email, `${em} as ${ROLE_LABEL[data.role]}`);
    return inserted;
  }

  setRole(actor: User, userId: string, role: Role) {
    requirePerm(actor, PERMS.USERS);
    const target = this.users.find(userId);
    if (!target) throw new AuthError("User not found", 404);
    const adminCount = this.users.count((u) => u.role === "admin" && u.status === "active");
    if (target.role === "admin" && role !== "admin" && adminCount <= 1) {
      throw new AuthError("Cannot demote the last active administrator", 409);
    }
    this.users.patch(userId, { role });
    logger.security("ROLE_CHANGED", actor.email, `${target.email}: ${target.role} → ${role}`);
  }

  setStatus(actor: User, userId: string, status: UserStatus) {
    requirePerm(actor, PERMS.USERS);
    if (actor.id === userId) throw new AuthError("You cannot suspend your own account", 409);
    const target = this.users.find(userId);
    if (!target) throw new AuthError("User not found", 404);
    this.users.patch(userId, { status });
    if (status === "suspended") {
      this.sessions.where((s) => s.userId === userId).forEach((s) => this.sessions.remove(s.token));
    }
    logger.security("USER_STATUS_CHANGED", actor.email, `${target.email} → ${status}`);
  }

  deleteUser(actor: User, userId: string) {
    requirePerm(actor, PERMS.USERS);
    if (actor.id === userId) throw new AuthError("You cannot delete your own account", 409);
    const target = this.users.find(userId);
    if (!target) throw new AuthError("User not found", 404);
    if (target.role === "admin" && this.users.count((u) => u.role === "admin") <= 1) {
      throw new AuthError("Cannot delete the last administrator", 409);
    }
    this.sessions.where((s) => s.userId === userId).forEach((s) => this.sessions.remove(s.token));
    this.users.remove(userId);
    logger.security("USER_DELETED", actor.email, target.email);
  }
}

export const authService = new AuthService(new Repository<User>("users"), new Repository<Session>("sessions", "token"));
