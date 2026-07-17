# Interplay Maps v1.0

Plataforma GIS Profesional para la Gestión de Infraestructura FTTH.

## Tecnología

- **Frontend:** Next.js, React, TypeScript, TailwindCSS, React Leaflet
- **Backend:** NestJS, TypeScript
- **Base de datos:** PostgreSQL + PostGIS + Prisma ORM

## Requisitos

- Node.js >= 18
- PostgreSQL >= 14 con PostGIS
- npm >= 9

## Instalación rápida

```bash
# 1. Clonar e instalar
git clone <repo> interplay-maps
cd interplay-maps

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de PostgreSQL

# 3. Setup automático
.\scripts\setup.ps1

# 4. Iniciar desarrollo
npm run dev
```

## Estructura

```
interplay-maps/
├── apps/
│   ├── frontend/          # Next.js + React Leaflet
│   └── backend/           # NestJS API
├── packages/
│   ├── database/          # Prisma schema + migrations
│   └── shared/            # Tipos y utilidades compartidas
├── docs/
├── scripts/
└── package.json           # Monorepo root
```

## Credenciales por defecto

| Rol          | Email                  | Contraseña     |
|-------------|------------------------|----------------|
| Admin        | admin@interplay.com    | admin123       |
| Supervisor   | supervisor@interplay.com | supervisor123 |
| Visualizador | visor@interplay.com    | visor123       |

## API

Documentación Swagger: `http://localhost:4000/api/docs`
