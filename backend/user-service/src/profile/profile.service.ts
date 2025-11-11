/*
AI Assistance Disclosure:
Tool: ChatGPT (GPT-5), date: 2025-10-08
Scope: Suggested service layer logic for retrieving and updating user profile data via Supabase/Prisma integration.
Author review: Modified database access methods for schema accuracy, added error handling and field-level validation.
*/

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileDto } from '../dto/profile.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Basic profile by auth user id (JWT sub)
   */
  async getProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        email: true,
        username: true,
        first_name: true,
        last_name: true,
      },
    });

    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  /**
   * Convenience: profile + recent history together.
   */
  async getMeWithHistory(userId: string) {
    const [profile] = await Promise.all([
      this.getProfile(userId),
      //this.getMatchHistory(userId, { take: 10 }), // last 10 entries
    ]);

    return { profile };
  }

  async updateProfile(userId: string, email: string, dto: ProfileDto) {
    const data = {
        username: dto.username,
        first_name: dto.first_name,
        last_name: dto.last_name,
    }

    return this.prisma.profile.upsert({
      where: { user_id: userId },
      update: data,
      create: { 
        user_id: userId, email: email, ...data 
      },
      select: {
        user_id: true,
        email: true,
        username: true,
        first_name: true,
        last_name: true,
      }
    });
  }

  async getUsername(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { user_id: userId },
      select: {
        username: true,
      },
    });

    if (!profile) throw new NotFoundException('Profile not found');
    return { username: profile.username };
  }
}

