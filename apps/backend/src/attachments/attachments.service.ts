import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(private prisma: PrismaService) {}

  async findByAssetId(assetId: string) {
    return this.prisma.attachment.findMany({
      where: { assetId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const attachment = await this.prisma.attachment.findUnique({ where: { id } });
    if (!attachment) throw new NotFoundException('Adjunto no encontrado');
    return attachment;
  }

  async create(data: { assetId: string; type: string; filename: string; url: string; mimeType?: string; sizeBytes?: number; metadata?: any; uploadedById?: string }) {
    return this.prisma.attachment.create({ data });
  }

  async delete(id: string) {
    await this.findById(id);
    return this.prisma.attachment.delete({ where: { id } });
  }
}
