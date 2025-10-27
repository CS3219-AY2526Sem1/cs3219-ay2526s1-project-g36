import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';

// sets the API route to 'auth'
@Controller('profile')
export class ProfileController {
    // declares which guard to use for this controller
    @UseGuards(BearerAuthGuard)
    // defines a GET endpoint at 'auth/me' to return the authenticated user's info
    @Get('me')
    
    me(@Req() req: any) {
        const { sub, email, role } = req.user || {};
        

        return { user: { sub, email, role } };
    }
}