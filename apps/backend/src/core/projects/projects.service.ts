import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(municipalityId?: string) {
    const where: any = {};
    if (municipalityId) where.municipalityId = municipalityId;
    return this.prisma.project.findMany({
      where,
      include: { municipality: true, _count: { select: { assets: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { municipality: true, assets: true },
    });
    if (!project) throw new NotFoundException('Proyecto no encontrado');
    return project;
  }

  async create(data: { name: string; municipalityId: string; description?: string }) {
    return this.prisma.project.create({ data });
  }

  async update(id: string, data: { name?: string; description?: string }) {
    return this.prisma.project.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.project.delete({ where: { id } });
  }
}
