import type { Request } from 'express';
import { db, audit_log } from '@workspace/db';

export async function writeAuditLog(
  staffId: number | undefined,
  action: string,
  entityType: string,
  entityId: string,
  details: unknown,
  req: Request,
): Promise<void> {
  await db.insert(audit_log).values({
    staff_id: staffId ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details: JSON.stringify(details),
    ip_address: req.ip ?? req.socket.remoteAddress ?? null,
  });
}
