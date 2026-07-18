import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './core/auth/auth.module';
import { MunicipalitiesModule } from './municipalities/municipalities.module';
import { ProjectsModule } from './core/projects/projects.module';
import { AssetTypesModule } from './core/asset-types/asset-types.module';
import { AssetsModule } from './assets/assets.module';
import { LayersModule } from './gis/layers/layers.module';
import { TopologyModule } from './gis/topology/topology.module';
import { SpatialModule } from './gis/spatial/spatial.module';
import { EditorModule } from './gis/editor/editor.module';
import { GISEngineModule } from './gis-engine/gis-engine.module';
import { ImportModule } from './import/import.module';
import { ValidationModule } from './validation/validation.module';
import { RelationshipsModule } from './relationships/relationships.module';
import { HealthModule } from './health/health.module';
import { ConfidenceModule } from './confidence/confidence.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { VersionsModule } from './versions/versions.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { StatisticsModule } from './statistics/statistics.module';
import { AuditModule } from './audit/audit.module';
import { EventsModule } from './events/events.module';
import { NetworkModule } from './network/network.module';
import { CapacityModule } from './capacity/capacity.module';
import { CoverageModule } from './coverage/coverage.module';
import { SyncModule } from './sync/sync.module';
import { QueryEngineModule } from './query-engine/query-engine.module';
import { SearchModule } from './search/search.module';
import { BaselineModule } from './baseline/baseline.module';
import { IntegrityModule } from './integrity/integrity.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    MunicipalitiesModule,
    ProjectsModule,
    AssetTypesModule,
    AssetsModule,
    LayersModule,
    TopologyModule,
    SpatialModule,
    EditorModule,
    GISEngineModule,
    ImportModule,
    ValidationModule,
    RelationshipsModule,
    HealthModule,
    ConfidenceModule,
    AttachmentsModule,
    VersionsModule,
    DashboardModule,
    StatisticsModule,
    AuditModule,
    EventsModule,
    SyncModule,
    NetworkModule,
    CapacityModule,
    CoverageModule,
    QueryEngineModule,
    SearchModule,
    BaselineModule,
    IntegrityModule,
  ],
})
export class AppModule {}
