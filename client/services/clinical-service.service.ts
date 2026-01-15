import apiClient from './apiClient';

export interface ClinicalService {
    id: string;
    code: string;
    name: string;
    description: string;
    category: string;
    imageUrl?: string;
    displayOrder: number;
}

class ClinicalServiceService {
    async getAllServices(): Promise<ClinicalService[]> {
        const response = await apiClient.get('/clinical-services');
        const data = (response as any).data || response;
        return Array.isArray(data) ? data : [];
    }

    async getServicesByCategory(category: string): Promise<ClinicalService[]> {
        const response = await apiClient.get(`/clinical-services/category/${category}`);
        const data = (response as any).data || response;
        return Array.isArray(data) ? data : [];
    }

    async getServiceByCode(code: string): Promise<ClinicalService> {
        const response = await apiClient.get(`/clinical-services/${code}`);
        return response.data;
    }
}

export const clinicalServiceService = new ClinicalServiceService();
