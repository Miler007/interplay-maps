import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GeocoderService {
  private readonly logger = new Logger(GeocoderService.name);

  constructor(private prisma: PrismaService) {}

  async reverseGeocode(lat: number, lng: number) {
    const municipality = await this.prisma.municipality.findFirst({
      where: {
        northBound: { gte: lat },
        southBound: { lte: lat },
        eastBound: { gte: lng },
        westBound: { lte: lng },
      },
      include: { department: true },
    });
    return {
      latitude: lat,
      longitude: lng,
      municipality: municipality?.name || null,
      department: municipality?.department?.name || null,
      municipalityId: municipality?.id || null,
      departmentId: municipality?.departmentId || null,
    };
  }

  async geocode(query: string) {
    return this.prisma.municipality.findMany({
      where: { name: { contains: query, mode: 'insensitive' } },
      include: { department: true },
      take: 10,
    });
  }
}
