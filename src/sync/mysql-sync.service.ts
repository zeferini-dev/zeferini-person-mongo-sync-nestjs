import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PersonMongo } from './person-mongo.schema';
import mysql, { RowDataPacket } from 'mysql2/promise';

interface PersonRow extends RowDataPacket {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class MysqlSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MysqlSyncService.name);
  private mysqlPool: mysql.Pool;
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly pollIntervalMs: number;
  private lastSyncTime: Date;

  constructor(
    @InjectModel(PersonMongo.name) private personMongoModel: Model<PersonMongo>,
    private readonly config: ConfigService,
  ) {
    this.pollIntervalMs = this.config.get<number>('MYSQL_SYNC_INTERVAL_MS', 5000);
    this.lastSyncTime = new Date(0); // Start from epoch
    
    const mysqlUrl = this.config.get<string>(
      'MYSQL_URL',
      'mysql://appuser:app123@mysql-app:3306/appdb',
    );

    this.logger.log(`MySQL URL: ${mysqlUrl.replace(/:[^:@]+@/, ':****@')}`);
    
    this.mysqlPool = mysql.createPool({
      uri: mysqlUrl,
      waitForConnections: true,
      connectionLimit: 10,
    });
  }

  async onModuleInit() {
    this.logger.log('MySQL to MongoDB sync service initialized');
    this.logger.log(`Poll interval: ${this.pollIntervalMs}ms`);
    
    // Wait a bit before starting to ensure MySQL is ready
    await this.waitForMySQL();
    
    await this.performInitialSync();
    this.startSyncLoop();
  }

  async onModuleDestroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    await this.mysqlPool.end();
    this.logger.log('MySQL to MongoDB sync service stopped');
  }

  private async waitForMySQL(): Promise<void> {
    const maxRetries = 30;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const connection = await this.mysqlPool.getConnection();
        connection.release();
        this.logger.log('Successfully connected to MySQL');
        return;
      } catch (error) {
        retries++;
        this.logger.warn(`Waiting for MySQL (attempt ${retries}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    throw new Error('Failed to connect to MySQL after maximum retries');
  }

  /**
   * Sincronização inicial: carrega todos os registros do MySQL para o MongoDB
   */
  private async performInitialSync(): Promise<void> {
    try {
      this.logger.log('Starting initial sync from MySQL to MongoDB...');
      
      const connection = await this.mysqlPool.getConnection();
      try {
        const [rows] = await connection.query<PersonRow[]>(
          'SELECT id, name, email, createdAt, updatedAt FROM persons'
        );
        
        if (rows.length === 0) {
          this.logger.log('No persons found in MySQL for initial sync');
          return;
        }

        let syncedCount = 0;
        for (const row of rows) {
          await this.upsertPersonToMongo(row);
          syncedCount++;
        }

        this.logger.log(`✅ Initial sync completed: ${syncedCount} persons synced to MongoDB`);
        this.lastSyncTime = new Date();
      } finally {
        connection.release();
      }
    } catch (error) {
      this.logger.error('Failed to perform initial sync', error);
      throw error;
    }
  }

  /**
   * Inicia o loop de sincronização periódica
   */
  private startSyncLoop(): void {
    this.logger.log(`🔄 Starting sync loop with interval: ${this.pollIntervalMs}ms`);
    
    this.syncInterval = setInterval(async () => {
      try {
        await this.syncChanges();
      } catch (error) {
        this.logger.error('Error during sync loop', error);
      }
    }, this.pollIntervalMs);
  }

  /**
   * Sincroniza apenas as mudanças desde a última sincronização
   */
  private async syncChanges(): Promise<void> {
    const connection = await this.mysqlPool.getConnection();
    try {
      // Busca registros atualizados desde a última sincronização
      const [rows] = await connection.query<PersonRow[]>(
        'SELECT id, name, email, createdAt, updatedAt FROM persons WHERE updatedAt > ?',
        [this.lastSyncTime]
      );

      if (rows.length === 0) {
        this.logger.debug('No changes detected in MySQL');
        return;
      }

      let syncedCount = 0;
      for (const row of rows) {
        await this.upsertPersonToMongo(row);
        syncedCount++;
      }

      this.logger.log(`✅ Synced ${syncedCount} changed persons to MongoDB`);
      this.lastSyncTime = new Date();
    } catch (error) {
      this.logger.error('Failed to sync changes', error);
    } finally {
      connection.release();
    }
  }

  /**
   * Insere ou atualiza uma pessoa no MongoDB
   */
  private async upsertPersonToMongo(person: PersonRow): Promise<void> {
    try {
      await this.personMongoModel.updateOne(
        { id: person.id },
        {
          $set: {
            id: person.id,
            name: person.name,
            email: person.email,
            createdAt: person.createdAt,
            updatedAt: person.updatedAt,
          },
        },
        { upsert: true }
      );

      this.logger.debug(`Upserted person ${person.id} (${person.name}) to MongoDB`);
    } catch (error) {
      this.logger.error(`Failed to upsert person ${person.id} to MongoDB`, error);
      throw error;
    }
  }

  /**
   * Método público para forçar uma sincronização manual
   */
  async forceSyncNow(): Promise<{ synced: number }> {
    this.logger.log('Manual sync triggered');
    
    const connection = await this.mysqlPool.getConnection();
    try {
      const [rows] = await connection.query<PersonRow[]>(
        'SELECT id, name, email, createdAt, updatedAt FROM persons'
      );

      let syncedCount = 0;
      for (const row of rows) {
        await this.upsertPersonToMongo(row);
        syncedCount++;
      }

      this.logger.log(`✅ Manual sync completed: ${syncedCount} persons synced`);
      this.lastSyncTime = new Date();
      
      return { synced: syncedCount };
    } finally {
      connection.release();
    }
  }

  /**
   * Retorna estatísticas de sincronização
   */
  async getSyncStats(): Promise<{
    mysqlCount: number;
    mongoCount: number;
    lastSync: Date;
    pollInterval: number;
    inSync: boolean;
  }> {
    const connection = await this.mysqlPool.getConnection();
    try {
      const [mysqlRows] = await connection.query<any[]>(
        'SELECT COUNT(*) as count FROM persons'
      );
      const mysqlCount = mysqlRows[0].count;
      
      const mongoCount = await this.personMongoModel.countDocuments();

      return {
        mysqlCount,
        mongoCount,
        lastSync: this.lastSyncTime,
        pollInterval: this.pollIntervalMs,
        inSync: mysqlCount === mongoCount,
      };
    } finally {
      connection.release();
    }
  }
}
