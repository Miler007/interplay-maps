import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Sembrando base de datos...');

  // ── Usuarios ──────────────────────────────────────────
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@interplay.com' },
    update: {},
    create: {
      email: 'admin@interplay.com',
      passwordHash: adminPassword,
      name: 'Admin Interplay',
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: 'supervisor@interplay.com' },
    update: {},
    create: {
      email: 'supervisor@interplay.com',
      passwordHash: await bcrypt.hash('supervisor123', 10),
      name: 'Supervisor Red',
      role: 'SUPERVISOR',
    },
  });

  await prisma.user.upsert({
    where: { email: 'visor@interplay.com' },
    update: {},
    create: {
      email: 'visor@interplay.com',
      passwordHash: await bcrypt.hash('visor123', 10),
      name: 'Visualizador',
      role: 'VISUALIZADOR',
    },
  });

  // ── Departamentos y Municipios ────────────────────────
  const tolima = await prisma.department.upsert({
    where: { name: 'Tolima' },
    update: {},
    create: { name: 'Tolima' },
  });

  const caldas = await prisma.department.upsert({
    where: { name: 'Caldas' },
    update: {},
    create: { name: 'Caldas' },
  });

  const fresno = await prisma.municipality.upsert({
    where: { name_departmentId: { name: 'Fresno', departmentId: tolima.id } },
    update: {},
    create: {
      name: 'Fresno',
      departmentId: tolima.id,
      northBound: 5.25,
      southBound: 5.1,
      eastBound: -74.9,
      westBound: -75.1,
    },
  });

  await prisma.municipality.upsert({
    where: { name_departmentId: { name: 'Mariquita', departmentId: tolima.id } },
    update: {},
    create: { name: 'Mariquita', departmentId: tolima.id },
  });

  await prisma.municipality.upsert({
    where: { name_departmentId: { name: 'Honda', departmentId: tolima.id } },
    update: {},
    create: { name: 'Honda', departmentId: tolima.id },
  });

  await prisma.municipality.upsert({
    where: { name_departmentId: { name: 'Manizales', departmentId: caldas.id } },
    update: {},
    create: { name: 'Manizales', departmentId: caldas.id },
  });

  // ── Tipos de Activo (plugin) ──────────────────────────
  const assetTypes = [
    { code: 'MUFLAS', name: 'Muflas', prefix: 'MUF', geometryType: 'POINT' },
    { code: 'CAJAS', name: 'Cajas', prefix: 'CAJ', geometryType: 'POINT' },
    { code: 'CTO', name: 'CTO', prefix: 'CTO', geometryType: 'POINT' },
    { code: 'SPLITTERS', name: 'Splitters', prefix: 'SPL', geometryType: 'POINT' },
    { code: 'POSTES', name: 'Postes', prefix: 'POS', geometryType: 'POINT' },
    { code: 'NODOS', name: 'Nodos', prefix: 'NOD', geometryType: 'POINT' },
    { code: 'CAMARAS', name: 'Cámaras', prefix: 'CAM', geometryType: 'POINT' },
    { code: 'EQUIPOS', name: 'Equipos', prefix: 'EQP', geometryType: 'POINT' },
  ];

  for (const at of assetTypes) {
    const existing = await prisma.assetType.findUnique({ where: { code: at.code } });
    if (!existing) {
      await prisma.assetType.create({ data: at });
    }
  }

  // ── Atributos dinámicos por tipo ──────────────────────
  const cajasType = await prisma.assetType.findUnique({ where: { code: 'CAJAS' } });
  const muflasType = await prisma.assetType.findUnique({ where: { code: 'MUFLAS' } });

  if (cajasType) {
    const cajaAttrs = [
      { code: 'puertos', name: 'Puertos', fieldType: 'NUMBER', unit: 'unidades', isRequired: true, sortOrder: 1 },
      { code: 'potencia', name: 'Potencia', fieldType: 'NUMBER', unit: 'dBm', sortOrder: 2 },
      { code: 'fibra', name: 'Fibra', fieldType: 'TEXT', sortOrder: 3 },
    ];
    for (const attr of cajaAttrs) {
      await prisma.attributeDefinition.upsert({
        where: { assetTypeId_code: { assetTypeId: cajasType.id, code: attr.code } },
        update: {},
        create: { ...attr, assetTypeId: cajasType.id },
      });
    }
  }

  if (muflasType) {
    const muflaAttrs = [
      { code: 'capacidad', name: 'Capacidad', fieldType: 'NUMBER', unit: 'fusiones', sortOrder: 1 },
      { code: 'bandejas', name: 'Bandejas', fieldType: 'NUMBER', unit: 'unidades', sortOrder: 2 },
      { code: 'fusiones', name: 'Fusiones', fieldType: 'NUMBER', unit: 'unidades', sortOrder: 3 },
    ];
    for (const attr of muflaAttrs) {
      await prisma.attributeDefinition.upsert({
        where: { assetTypeId_code: { assetTypeId: muflasType.id, code: attr.code } },
        update: {},
        create: { ...attr, assetTypeId: muflasType.id },
      });
    }
  }

  // ── Capas dinámicas ──────────────────────────────────
  const layers = [
    { code: 'INFRAESTRUCTURA', name: 'Infraestructura', sortOrder: 1 },
    { code: 'CLIENTES', name: 'Clientes', sortOrder: 2 },
    { code: 'COBERTURA', name: 'Cobertura', sortOrder: 3 },
    { code: 'PROYECTOS', name: 'Proyectos', sortOrder: 4 },
    { code: 'MANTENIMIENTO', name: 'Mantenimiento', sortOrder: 5 },
    { code: 'TOPOLOGIA', name: 'Topología', sortOrder: 6 },
  ];
  for (const layer of layers) {
    await prisma.layer.upsert({
      where: { code: layer.code },
      update: {},
      create: layer,
    });
  }

  // ── Health Score Config ───────────────────────────────
  const healthIndicators = [
    { indicatorCode: 'GPS', name: 'Ubicación GPS', weight: 25 },
    { indicatorCode: 'PHOTOS', name: 'Fotografías', weight: 15 },
    { indicatorCode: 'RELATIONSHIPS', name: 'Relaciones', weight: 20 },
    { indicatorCode: 'DATA', name: 'Calidad de Datos', weight: 25 },
    { indicatorCode: 'VALIDATION', name: 'Validación', weight: 15 },
  ];
  for (const ind of healthIndicators) {
    await prisma.healthScoreConfig.upsert({
      where: { indicatorCode: ind.indicatorCode },
      update: {},
      create: ind,
    });
  }

  // ── Confidence Score Config ───────────────────────────
  const confidenceFactors = [
    { factorCode: 'VALID_COORDS', name: 'Coordenadas válidas', weight: 30 },
    { factorCode: 'NAME_IDENTIFIED', name: 'Nombre identificado', weight: 25 },
    { factorCode: 'NO_DUPLICATES', name: 'Sin duplicados', weight: 20 },
    { factorCode: 'HAS_PHOTO', name: 'Tiene fotografía', weight: 10 },
    { factorCode: 'REVIEWED', name: 'Revisado por admin', weight: 15 },
  ];
  for (const fc of confidenceFactors) {
    await prisma.confidenceScoreConfig.upsert({
      where: { factorCode: fc.factorCode },
      update: {},
      create: fc,
    });
  }

  // ── Proyecto de ejemplo ───────────────────────────────
  await prisma.project.upsert({
    where: { name_municipalityId: { name: 'Fresno Norte', municipalityId: fresno.id } },
    update: {},
    create: {
      name: 'Fresno Norte',
      municipalityId: fresno.id,
      description: 'Expansión de red zona norte de Fresno',
    },
  });

  console.log('✅ Seed completado exitosamente');
  console.log('   Admin:      admin@interplay.com / admin123');
  console.log('   Supervisor: supervisor@interplay.com / supervisor123');
  console.log('   Visor:      visor@interplay.com / visor123');
  console.log('   8 tipos de activo con atributos dinámicos');
  console.log('   6 capas dinámicas');
  console.log('   Health Score y Confidence Score configurables');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
