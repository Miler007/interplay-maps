import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(private prisma: PrismaService) {}

  async create(data: {
    userId?: string; municipalityId: string; assetId?: string;
    category: string; priority: string; description: string;
  }) {
    const feedback = await this.prisma.fieldFeedback.create({ data: data as any });
    this.logger.log(`Feedback creado: ${feedback.id} - ${data.category}`);
    return feedback;
  }

  async list(municipalityId?: string, status?: string, category?: string) {
    const where: any = {};
    if (municipalityId) where.municipalityId = municipalityId;
    if (status) where.status = status;
    if (category) where.category = category;
    return this.prisma.fieldFeedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async update(id: string, data: { status?: string; resolution?: string; priority?: string }) {
    return this.prisma.fieldFeedback.update({ where: { id }, data: data as any });
  }

  async stats(municipalityId?: string) {
    const where: any = {};
    if (municipalityId) where.municipalityId = municipalityId;
    const all = await this.prisma.fieldFeedback.findMany({ where, select: { status: true, category: true, priority: true } });
    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    all.forEach((f: any) => {
      byStatus[f.status] = (byStatus[f.status] || 0) + 1;
      byCategory[f.category] = (byCategory[f.category] || 0) + 1;
    });
    return { total: all.length, abiertos: byStatus.ABIERTO || 0, porStatus: byStatus, porCategoria: byCategory };
  }
}
