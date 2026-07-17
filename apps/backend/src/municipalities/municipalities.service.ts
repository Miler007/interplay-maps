import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MunicipalitiesService {
  constructor(private prisma: PrismaService) {}

  async createDepartment(name: string) {
    const existing = await this.prisma.department.findUnique({ where: { name } });
    if (existing) {
      throw new ConflictException(`El departamento '${name}' ya existe`);
    }
    return this.prisma.department.create({ data: { name } });
  }

  async findAllDepartments() {
    return this.prisma.department.findMany({
      include: { municipalities: true },
      orderBy: { name: 'asc' },
    });
  }

  async createMunicipality(name: string, departmentId: string, bounds?: {
    north: number; south: number; east: number; west: number;
  }) {
    const department = await this.prisma.department.findUnique({ where: { id: departmentId } });
    if (!department) {
      throw new NotFoundException('Departamento no encontrado');
    }
    return this.prisma.municipality.create({
      data: {
        name,
        departmentId,
        northBound: bounds?.north,
        southBound: bounds?.south,
        eastBound: bounds?.east,
        westBound: bounds?.west,
      },
    });
  }

  async findMunicipalitiesByDepartment(departmentId: string) {
    return this.prisma.municipality.findMany({
      where: { departmentId },
      include: { _count: { select: { assets: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createProject(name: string, municipalityId: string, description?: string) {
    const municipality = await this.prisma.municipality.findUnique({
      where: { id: municipalityId },
    });
    if (!municipality) {
      throw new NotFoundException('Municipio no encontrado');
    }
    return this.prisma.project.create({
      data: { name, municipalityId, description },
    });
  }

  async findProjectsByMunicipality(municipalityId: string) {
    return this.prisma.project.findMany({
      where: { municipalityId },
      orderBy: { name: 'asc' },
    });
  }

  async deleteDepartment(id: string) {
    return this.prisma.department.delete({ where: { id } });
  }

  async deleteMunicipality(id: string) {
    return this.prisma.municipality.delete({ where: { id } });
  }
}
