import type { Request, Response, NextFunction } from "express";
import type { CorsOptions, CorsOptionsDelegate } from "../type";
export declare const corsSync: (options: CorsOptions | CorsOptionsDelegate, req: Request, res: Response) => boolean;
export declare const middlewareWrapper: (options?: CorsOptions | CorsOptionsDelegate) => (req: Request, res: Response, next: NextFunction) => void;
export default middlewareWrapper;
//# sourceMappingURL=Cors.d.ts.map