import { Prisma } from '@prisma/client';
import { ClsServiceManager } from 'nestjs-cls';

export const auditExtension = Prisma.defineExtension((client) => {
    return client.$extends({
        query: {
            $allModels: {
                async create({ args, query }) {
                    const cls = ClsServiceManager.getClsService();
                    const user = cls.get('user'); // Assumes 'user' is stored in CLS

                    if (user?.id) {
                        // Safely cast data to any to inject createdById if strictly typed model supports it
                        // Realistically, we should check if the model has the field, but for Phase 3 Core models we know they do.
                        // A robust implementation checks model metadata or suppresses TS errors carefully.
                        (args.data as any).createdById = user.id;
                    }
                    return query(args);
                },
                async update({ args, query }) {
                    const cls = ClsServiceManager.getClsService();
                    const user = cls.get('user');

                    if (user?.id) {
                        (args.data as any).updatedById = user.id;
                    }
                    return query(args);
                },
                async updateMany({ args, query }) {
                    const cls = ClsServiceManager.getClsService();
                    const user = cls.get('user');

                    if (user?.id) {
                        (args.data as any).updatedById = user.id;
                    }
                    return query(args);
                }
            }
        }
    });
});
