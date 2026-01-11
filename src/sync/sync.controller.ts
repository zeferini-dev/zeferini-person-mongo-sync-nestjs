import { Controller, Get, Post } from '@nestjs/common';
import { MysqlSyncService } from './mysql-sync.service';

@Controller('sync')
export class SyncController {
  constructor(private readonly mysqlSyncService: MysqlSyncService) {}

  @Get('stats')
  async getStats() {
    return this.mysqlSyncService.getSyncStats();
  }

  @Post('force')
  async forceSync() {
    return this.mysqlSyncService.forceSyncNow();
  }
}
