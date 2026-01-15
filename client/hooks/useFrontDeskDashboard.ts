'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentService, AppointmentStatus } from '@/services/appointment.service';
import { patientService } from '@/services/patient.service';
import { billingService } from '@/services/billing.service';
import { inventoryService } from '@/services/inventory.service';

export function useFrontDeskDashboard() {
    const queryClient = useQueryClient();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // --- QUERIES ---
    const { data: appointmentsData, isLoading: isLoadingAppointments } = useQuery({
        queryKey: ['appointments', 'today'],
        queryFn: () => appointmentService.getAppointments(0, 100, {
            startDate: todayStart,
            endDate: todayEnd
        }),
    });

    const { data: patientsData, isLoading: isLoadingPatients } = useQuery({
        queryKey: ['patients', 'dashboard'],
        queryFn: () => patientService.getPatients(0, 5),
    });

    const { data: billsData, isLoading: isLoadingBills } = useQuery({
        queryKey: ['bills', 'dashboard'],
        queryFn: () => billingService.getBills(0, 5),
    });

    const { data: stockData, isLoading: isLoadingStock } = useQuery({
        queryKey: ['inventory-stock', 'dashboard'],
        queryFn: () => inventoryService.getStock(),
    });

    // --- MUTATIONS ---
    const checkInMutation = useMutation({
        mutationFn: (id: string) => appointmentService.checkIn(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
        },
        onError: (error: any) => {
            alert('Failed to check in: ' + (error.response?.data?.message || 'Unknown error'));
        }
    });

    // --- COMPUTED ---
    const todayAppointments = appointmentsData?.data || [];
    const checkedInCount = todayAppointments.filter(a => a.status === AppointmentStatus.CHECKED_IN).length;
    const pendingBillsCount = billsData?.data.filter((b) => b.status === 'PENDING' || b.status === 'SENT').length || 0;

    const lowStockItemsCount = stockData?.filter((s) => {
        const onHand = parseFloat(s.quantityOnHand);
        const reorderPoint = s.item?.reorderPoint ? parseFloat(s.item.reorderPoint) : 0;
        return onHand <= reorderPoint && reorderPoint > 0;
    }).length || 0;

    const isLoading = isLoadingAppointments || isLoadingPatients || isLoadingBills || isLoadingStock;

    return {
        appointments: todayAppointments,
        patients: patientsData?.data || [],
        stats: {
            appointmentsCount: todayAppointments.length,
            checkedInCount,
            pendingBillsCount,
            lowStockItemsCount,
        },
        isLoading,
        checkIn: checkInMutation.mutate,
        isCheckingIn: checkInMutation.isPending,
    };
}
