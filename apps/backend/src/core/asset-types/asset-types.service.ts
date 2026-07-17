import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AssetTypesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.assetType.findMany({
      orderBy: { name: 'asc' },
      include: { attributes: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async findById(id: string) {
    const at = await this.prisma.assetType.findUnique({
      where: { id },
      include: { attributes: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!at) throw new NotFoundException('Tipo de activo no encontrado');
    return at;
  }

  async create(data: { code: string; name: string; prefix: string; icon?: string; geometryType?: string }) {
    return this.prisma.assetType.create({ data });
  }

  async update(id: string, data: { name?: string; icon?: string; geometryType?: string }) {
    await this.findById(id);
    return this.prisma.assetType.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.findById(id);
    return this.prisma.assetType.delete({ where: { id } });
  }

  async getAttributeDefinitions(typeId: string) {
    return this.prisma.attributeDefinition.findMany({
      where: { assetTypeId: typeId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async upsertAttributeDefinition(
    typeId: string,
    data: {
      id?: string;
      code: string;
      name: string;
      fieldType?: string;
      isRequired?: boolean;
      options?: any;
      sortOrder?: number;
      unit?: string;
    },
  ) {
    if (data.id) {
      return this.prisma.attributeDefinition.update({
        where: { id: data.id },
        data: {
          code: data.code,
          name: data.name,
          fieldType: data.fieldType,
          isRequired: data.isRequired,
          options: data.options,
          sortOrder: data.sortOrder,
          unit: data.unit,
          assetTypeId: typeId,
        },
      });
    }
    return this.prisma.attributeDefinition.create({
      data: {
        code: data.code,
        name: data.name,
        fieldType: data.fieldType || 'TEXT',
        isRequired: data.isRequired ?? false,
        options: data.options,
        sortOrder: data.sortOrder,
        unit: data.unit,
        assetTypeId: typeId,
      },
    });
  }

  async deleteAttributeDefinition(id: string) {
    return this.prisma.attributeDefinition.delete({ where: { id } });
  }
}
