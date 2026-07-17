# Guía de Despliegue — Interplay Maps v1.0

## Requisitos del Sistema

| Componente | Versión Mínima |
|------------|---------------|
| Node.js | 18 LTS |
| PostgreSQL | 14 + PostGIS 3 |
| npm | 9+ |
| Disco | 2 GB libres |
| RAM | 4 GB recomendados |

---

## 1. Base de Datos

```bash
# Crear base de datos con extensiones espaciales
psql -U postgres -c "CREATE DATABASE interplay_maps;"
psql -U postgres -d interplay_maps -c "CREATE EXTENSION IF NOT EXISTS postgis;"
psql -U postgres -d interplay_maps -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

# Configurar variable de entorno
set DATABASE_URL="postgresql://user:password@localhost:5432/interplay_maps?schema=public"
```

---

## 2. Backend (NestJS + Prisma)

```bash
cd apps/backend

# Instalar dependencias
npm install

# Generar cliente Prisma + migraciones
npx prisma generate
npx prisma migrate dev --name init

# (Opcional) Seed de datos iniciales
# npx prisma db seed

# Iniciar en desarrollo
npm run dev        # http://localhost:4000

# Construir para producción
npm run build
npm run start:prod # Puerto 4000
```

### Variables de Entorno (Backend)

```
DATABASE_URL=postgresql://user:password@localhost:5432/interplay_maps?schema=public
JWT_SECRET=<generar con: openssl rand -hex 32>
JWT_REFRESH_SECRET=<generar con: openssl rand -hex 32>
PORT=4000
CORS_ORIGIN=http://localhost:3000
```

---

## 3. Frontend (Next.js)

```bash
cd apps/frontend

# Instalar dependencias
npm install

# Iniciar en desarrollo
npm run dev        # http://localhost:3000

# Construir para producción
npm run build
npm run start      # Puerto 3000
```

### Variables de Entorno (Frontend)

```
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

---

## 4. Monorepo (build completo)

```bash
# Desde la raíz del proyecto
npm install

# Construir shared package primero
cd packages/shared
npm run build

# Construir backend
cd ../../apps/backend
npm run build

# Construir frontend
cd ../frontend
npm run build
```

---

## 5. Verificar el Despliegue

```bash
# 1. Backend healthcheck
curl http://localhost:4000/api/v1/dashboard
# → {"totalAssets":0,"activeAssets":0,...}

# 2. Frontend
curl http://localhost:3000/dashboard
# → HTML con el Dashboard Ejecutivo

# 3. Prisma Studio (opcional, administración BD)
cd apps/backend
npx prisma studio  # http://localhost:5555
```

---

## 6. Post-Despliegue — Operation Zero

Una vez el sistema esté corriendo:

1. **Crear usuario ADMIN** via `POST /api/v1/auth/register`
2. **Crear Departamento/Municipio** en `/municipalities`
3. **Importar datos** desde `/import` (modo simulación primero)
4. **Validar con equipo técnico** desde `/pilot/tour`
5. **Crear Baseline** desde `/operation-zero/baselines`
6. **Publicar municipio** desde `/pilot/quality/[id]`

---

## 7. Arquitectura de Puertos

| Servicio | Puerto | URL |
|----------|--------|-----|
| Frontend (Next.js) | 3000 / 443 | http://localhost:3000 / https://interplay-maps.pages.dev |
| Backend (NestJS) | 4000 | http://localhost:4000 |
| Prisma Studio | 5555 | http://localhost:5555 |
| PostgreSQL | 5432 | postgresql://localhost:5432 |
| Railway Backend | 443 | https://interplay-maps-backend.up.railway.app |
| Nginx (VPS) | 443 | https://api.interplay-maps.com |

---

---

## 8. Despliegue Gratuito en Producción

**Opción recomendada: Render + Supabase** — ambas con tier gratuito permanente.

### Supabase (Base de Datos con PostGIS)

```bash
# 1. Crear cuenta en supabase.com (no pide tarjeta)
# 2. Crear nuevo proyecto (región: US East)
# 3. Ir a Project Settings → Database → Connection string
#    → Copiar URI tipo: postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres
```

PostGIS viene pre-instalado en Supabase. El `entrypoint.sh` ejecuta `CREATE EXTENSION postgis` automáticamente.

### Render (Backend)

```bash
# 1. Crear cuenta en render.com (pide tarjeta pero no cobra)
# 2. Dashboard → New + → Blueprint
# 3. Conectar repositorio de GitHub
# 4. Render lee render.yaml automáticamente
# 5. Configurar DATABASE_URL con la URI de Supabase
```

O manualmente:

```bash
# 1. New Web Service → conectar repo
# 2. Runtime: Docker, Branch: main
# 3. Dockerfile Path: apps/backend/Dockerfile
# 4. Añadir variables de entorno:
#    DATABASE_URL=<URI de Supabase>
#    JWT_SECRET=<openssl rand -hex 32>
#    JWT_REFRESH_SECRET=<openssl rand -hex 32>
#    FRONTEND_URL=https://interplay-maps.pages.dev
# 5. Plan: Free (se duerme a los 15min)
```

El backend genera automáticamente la URL tipo: `https://interplay-maps-backend.onrender.com`

### Frontend (Cloudflare Pages)

Ya está desplegado en: `https://interplay-maps.pages.dev`

Actualizar variable de entorno si la URL del backend cambia:

```bash
# En apps/frontend/wrangler.toml:
# vars = { NEXT_PUBLIC_API_URL = "https://interplay-maps-backend.onrender.com/api/v1" }

# Redeploy:
cd apps/frontend
npx wrangler pages deploy out --project-name=interplay-maps
```

### Alternativa: VPS con Docker Compuse

Si prefieres control total sin que se duerma:

| Plataforma | Free Tier | PostGIS | Notas |
|------------|-----------|---------|-------|
| Oracle Cloud | 4 CPU, 24GB, 200GB ✅ | ✅ | Pide tarjeta, siempre activo |
| Fly.io | 3 VMs 256MB, 3GB | ✅ (Docker) | Se duerme sin tráfico |
| Render | 512MB, 15min timeout | ❌ | Se duerme, sin PostGIS nativo |

**Oracle Cloud Always Free** es la única opción gratuita que NO se duerme. Instrucciones:

```bash
# 1. Crear VM ARM (Ubuntu 22.04)
# 2. Instalar Docker:
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 3. Clonar y desplegar:
git clone <repo> /opt/interplay-maps
cd /opt/interplay-maps
docker compose -f docker-compose.prod.yml up -d
```

---

## 9. Post-Despliegue — Operation Zero

Una vez el sistema esté corriendo:

1. Acceder a `https://interplay-maps.pages.dev`
2. Login como admin: `admin@interplay.com` / `admin123`
3. Ir a `/municipalities` → crear **Tolima** → **Fresno**
4. Ir a `/import` → cargar `data/fresno/FRESNO-2026-001/` (modo simulación)
5. Validar datos desde `/pilot/quality/[id]`
6. Crear Baseline desde `/operation-zero/baselines`
7. Publicar municipio

---

## 10. Solución de Problemas Comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| `ECONNREFUSED` al conectar BD | PostgreSQL no corriendo | `pg_isready` o iniciar servicio |
| `relation does not exist` | Migraciones no ejecutadas | `npx prisma migrate dev` |
| `Cannot find module @interplay/shared` | Shared no compilado | `cd packages/shared && npm run build` |
| CORS error | Origen no permitido | Verificar `CORS_ORIGIN` en backend |
| Token inválido | JWT_SECRET cambiado | Regenerar tokens o limpiar localStorage |
