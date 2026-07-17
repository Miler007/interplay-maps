import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(data: { userId: string; action: string; entityType: string; entityId: string; details?: any; ip?: string }) {
    return this.prisma.auditLog.create({ data });
  }

  async findAll(params?: { userId?: string; entityType?: string; entityId?: string; action?: string; limit?: number; offset?: number }) {
    const where: any = {};
    if (params?.userId) where.userId = params.userId;
    if (params?.entityType) where.entityType = params.entityType;
    if (params?.entityId) where.entityId = params.entityId;
    if (params?.action) where.action = params.action;
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: params?.limit || 50,
        skip: params?.offset || 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total };
  }

  async getByEntity(entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
