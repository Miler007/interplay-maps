Write-Host "🚀 Configurando Interplay Maps v1.0" -ForegroundColor Cyan
Write-Host ""

# Verificar Node.js
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "❌ Node.js no encontrado. Instálalo desde https://nodejs.org" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js $nodeVersion" -ForegroundColor Green

# Verificar npm
$npmVersion = npm --version
Write-Host "✅ npm $npmVersion" -ForegroundColor Green

# Verificar PostgreSQL
$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
    Write-Host "⚠️  PostgreSQL no encontrado en PATH. Asegúrate de que esté instalado y corriendo." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📦 Instalando dependencias..." -ForegroundColor Cyan
npm install

Write-Host ""
Write-Host "📦 Generando cliente Prisma..." -ForegroundColor Cyan
npm run db:generate

Write-Host ""
Write-Host "📦 Configurando base de datos..." -ForegroundColor Cyan
npm run db:push

Write-Host ""
Write-Host "🌱 Sembrando datos de ejemplo..." -ForegroundColor Cyan
npm run db:seed

Write-Host ""
Write-Host "✅ Configuración completada" -ForegroundColor Green
Write-Host ""
Write-Host "Para iniciar el servidor de desarrollo:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Credenciales de ejemplo:" -ForegroundColor Yellow
Write-Host "  Admin:      admin@interplay.com / admin123"
Write-Host "  Supervisor: supervisor@interplay.com / supervisor123"
Write-Host "  Visor:      visor@interplay.com / visor123"
