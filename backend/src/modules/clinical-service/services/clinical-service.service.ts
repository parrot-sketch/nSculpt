import { Injectable, NotFoundException } from '@nestjs/common';
import { ClinicalServiceRepository } from '../repositories/clinical-service.repository';

@Injectable()
export class ClinicalServiceService {
    constructor(private readonly repository: ClinicalServiceRepository) { }

    async getAllServices() {
        return this.repository.findAll();
    }

    async getServicesByCategory(category: string) {
        return this.repository.findByCategory(category);
    }

    async getServiceByCode(code: string) {
        const service = await this.repository.findByCode(code);
        if (!service) {
            throw new NotFoundException(`Service with code ${code} not found`);
        }
        return service;
    }
}
