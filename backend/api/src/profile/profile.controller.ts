import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';
import { ProfileService } from './profile.service';
import { ProfileDto } from '../dto/profile.dto';

// sets the API route to 'auth'
@Controller('profile')

@UseGuards(BearerAuthGuard)
export class ProfileController {
    constructor(private readonly profileService: ProfileService) {}
    // declares which guard to use for this controller
    @UseGuards(BearerAuthGuard)
    // defines a GET endpoint at 'auth/me' to return the authenticated user's info
    @Get('me')
    
    me(@Req() req: any) {
        const { sub, email, role } = req.user || {};
        return this.profileService.getMeWithHistory(sub);
        //return { user: { sub, email, role } };
    }
    
    @Patch('me')
    async updateMe(@Req() req: any, @Body() dto: ProfileDto) {
        const { sub, email, role } = req.user || {};
        return this.profileService.updateProfile(sub, email, dto);
    }
}