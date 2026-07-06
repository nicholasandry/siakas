import "server-only";

import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";

export type AuditLogInput = {
  actorUserId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
};

export type AuditLogListItem = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  beforeData: string | null;
  afterData: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  actorName: string | null;
  actorEmail: string | null;
};

export type AuditLogFilters = {
  action?: string;
  entity?: string;
  actorUserId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
};

export type PageAuditOptions = {
  entity: string;
  entityId?: string | null;
  view?: string;
  metadata?: Record<string, unknown>;
};

export async function writeAuditLog(input: AuditLogInput) {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? headerStore.get("x-real-ip") ?? null;
  const userAgent = headerStore.get("user-agent");

  await db.insert(auditLogs).values({
    actorUserId: input.actorUserId,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId ?? null,
    beforeData: input.beforeData !== undefined ? JSON.stringify(input.beforeData) : null,
    afterData: input.afterData !== undefined ? JSON.stringify(input.afterData) : null,
    ipAddress,
    userAgent,
  });
}

export async function auditPageView(actorUserId: string, options: PageAuditOptions) {
  await writeAuditLog({
    actorUserId,
    action: "read",
    entity: options.entity,
    entityId: options.entityId ?? null,
    afterData: {
      view: options.view,
      ...options.metadata,
    },
  });
}

export async function auditAuthEvent(input: {
  actorUserId?: string | null;
  action: "login" | "login_failed" | "logout";
  email?: string;
  metadata?: Record<string, unknown>;
}) {
  await writeAuditLog({
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    entity: "session",
    afterData: {
      email: input.email,
      ...input.metadata,
    },
  });
}

export async function auditAccessDenied(
  actorUserId: string | null,
  context: { entity?: string; reason?: string; path?: string; metadata?: Record<string, unknown> }
) {
  await writeAuditLog({
    actorUserId,
    action: "access_denied",
    entity: context.entity ?? "system",
    afterData: context,
  });
}

export async function listAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogListItem[]> {
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  const conditions = [];

  if (filters.action) {
    conditions.push(eq(auditLogs.action, filters.action));
  }

  if (filters.entity) {
    conditions.push(eq(auditLogs.entity, filters.entity));
  }

  if (filters.actorUserId) {
    conditions.push(eq(auditLogs.actorUserId, filters.actorUserId));
  }

  if (filters.dateFrom) {
    conditions.push(gte(auditLogs.createdAt, new Date(`${filters.dateFrom}T00:00:00`)));
  }

  if (filters.dateTo) {
    conditions.push(lte(auditLogs.createdAt, new Date(`${filters.dateTo}T23:59:59.999`)));
  }

  const query = db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entity: auditLogs.entity,
      entityId: auditLogs.entityId,
      beforeData: auditLogs.beforeData,
      afterData: auditLogs.afterData,
      ipAddress: auditLogs.ipAddress,
      userAgent: auditLogs.userAgent,
      createdAt: auditLogs.createdAt,
      actorName: users.name,
      actorEmail: users.email,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorUserId, users.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  if (conditions.length > 0) {
    return query.where(and(...conditions));
  }

  return query;
}

export async function countAuditLogs(filters: Pick<AuditLogFilters, "action" | "entity" | "actorUserId" | "dateFrom" | "dateTo"> = {}) {
  const conditions = [];

  if (filters.action) {
    conditions.push(eq(auditLogs.action, filters.action));
  }

  if (filters.entity) {
    conditions.push(eq(auditLogs.entity, filters.entity));
  }

  if (filters.actorUserId) {
    conditions.push(eq(auditLogs.actorUserId, filters.actorUserId));
  }

  if (filters.dateFrom) {
    conditions.push(gte(auditLogs.createdAt, new Date(`${filters.dateFrom}T00:00:00`)));
  }

  if (filters.dateTo) {
    conditions.push(lte(auditLogs.createdAt, new Date(`${filters.dateTo}T23:59:59.999`)));
  }

  const query = db.select({ count: sql<number>`count(*)::int` }).from(auditLogs);

  if (conditions.length > 0) {
    const [row] = await query.where(and(...conditions));
    return row?.count ?? 0;
  }

  const [row] = await query;
  return row?.count ?? 0;
}

export async function listAuditActorOptions() {
  return db
    .selectDistinct({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(auditLogs)
    .innerJoin(users, eq(auditLogs.actorUserId, users.id))
    .orderBy(asc(users.name));
}

export async function getAuditLogById(id: string): Promise<AuditLogListItem | null> {
  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entity: auditLogs.entity,
      entityId: auditLogs.entityId,
      beforeData: auditLogs.beforeData,
      afterData: auditLogs.afterData,
      ipAddress: auditLogs.ipAddress,
      userAgent: auditLogs.userAgent,
      createdAt: auditLogs.createdAt,
      actorName: users.name,
      actorEmail: users.email,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorUserId, users.id))
    .where(eq(auditLogs.id, id))
    .limit(1);

  return rows[0] ?? null;
}
