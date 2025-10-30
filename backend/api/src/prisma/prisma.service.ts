// src/prisma/prisma.service.ts
import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect(); // connect to the DB when Nest starts
  }

  async onModuleDestroy() {
    await this.$disconnect(); // disconnect from the DB when Nest stops
    }
}
