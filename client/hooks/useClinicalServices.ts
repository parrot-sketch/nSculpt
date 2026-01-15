import { useQuery } from '@tanstack/react-query';
import { clinicalServiceService } from '@/services/clinical-service.service';

export function useClinicalServices() {
    return useQuery({
        queryKey: ['clinical-services'],
        queryFn: () => clinicalServiceService.getAllServices(),
    });
}

export function useClinicalServicesByCategory(category: string) {
    return useQuery({
        queryKey: ['clinical-services', 'category', category],
        queryFn: () => clinicalServiceService.getServicesByCategory(category),
        enabled: !!category,
    });
}

export function useClinicalServiceByCode(code: string) {
    return useQuery({
        queryKey: ['clinical-services', 'code', code],
        queryFn: () => clinicalServiceService.getServiceByCode(code),
        enabled: !!code,
    });
}
