import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from './client';
import { auditExtension } from './audit.extension';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    // We use this 'extended' property to access the client with extensions applied
    // Because 'this' (PrismaClient) cannot be easily mutated to add extensions in-place
    // effectively. However, effectively overriding the methods or using a proxy is better.
    // BUT: The simplest way to integrate with existing code (which might use bare PrismaClient)
    // while enforcing audit for NEW services is to expose the extended client.

    private _extendedClient: any;

    constructor() {
        super(); // We extend PrismaClient to satisfy DI, but we might delegate

        // Use the existing singleton to ensure connection sharing? 
        // getPrismaClient() returns a PrismaClient instance.
        // If we extend PrismaClient, we create a NEW instance. 
        // To share the pool, strict singleton is needed.
        // But getPrismaClient() usage in Repos implies direct usage.

        // Better approach: This Service wraps the extension logic
        const baseClient = getPrismaClient();
        this._extendedClient = baseClient.$extends(auditExtension);

        // Proxy 'this' to the extended client for methods that overlap?
        // It's tricky to inherit from PrismaClient AND verify audit columns.
        // So we return the extended client proxy.
        return new Proxy(this, {
            get: (target, prop, receiver) => {
                if (prop in target._extendedClient) {
                    return target._extendedClient[prop];
                }
                return Reflect.get(target, prop, receiver);
            }
        });
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
