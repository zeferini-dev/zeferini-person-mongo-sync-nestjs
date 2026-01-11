import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PersonMongo, PersonMongoSchema } from './person-mongo.schema';
import { MysqlSyncService } from './mysql-sync.service';
import { SyncController } from './sync.controller';
import { PersonQueryController } from './person-query.controller';
import { PersonQueryService } from './person-query.service';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>(
          'MONGODB_URL',
          'mongodb://admin:admin123@mongodb-query:27017/querydb?authSource=admin',
        );
        return { uri };
      },
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: PersonMongo.name, schema: PersonMongoSchema },
    ]),
  ],
  controllers: [SyncController, PersonQueryController],
  providers: [MysqlSyncService, PersonQueryService],
  exports: [MysqlSyncService],
})
export class SyncModule {}
