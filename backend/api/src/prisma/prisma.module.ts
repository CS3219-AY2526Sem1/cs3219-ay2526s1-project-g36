// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // makes PrismaService available app-wide without reimporting
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
