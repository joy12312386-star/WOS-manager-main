import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    user?: {
        id: string;
        gameId: string;
        isAdmin: boolean;
    };
}
export declare function generateToken(userId: string, gameId: string, isAdmin: boolean): string;
export declare function verifyToken(token: string): any;
export declare function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): Response<any, Record<string, any>>;
export declare function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>>>;
