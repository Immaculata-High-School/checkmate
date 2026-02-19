import { prisma } from './db';

interface AuditLogParams {
  userId?: string | null;
  organizationId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Create an audit log entry. Fire-and-forget — errors are caught and logged.
 */
export function logAudit(params: AuditLogParams): void {
  prisma.auditLog
    .create({
      data: {
        userId: params.userId ?? undefined,
        organizationId: params.organizationId ?? undefined,
        action: params.action,
        entityType: params.entityType ?? undefined,
        entityId: params.entityId ?? undefined,
        details: params.details ?? undefined,
        ipAddress: params.ipAddress ?? undefined,
        userAgent: params.userAgent ?? undefined
      }
    })
    .catch((err) => {
      console.error('[AuditLog] Failed to write audit log:', err);
    });
}

/**
 * Extract IP and user agent from a SvelteKit RequestEvent for audit logging.
 */
export function getRequestInfo(event: { request: Request; getClientAddress: () => string }) {
  return {
    ipAddress: event.getClientAddress(),
    userAgent: event.request.headers.get('user-agent') || undefined
  };
}
