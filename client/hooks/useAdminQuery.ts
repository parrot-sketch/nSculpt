import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/admin.service';
import type {
    UserQueryParams,
    CreateUserRequest,
    UpdateUserRequest,
    AssignRoleRequest
} from '../types/admin';

export function useAdminDashboardStats() {
    return useQuery({
        queryKey: ['admin', 'dashboard'],
        queryFn: () => adminService.getDashboardStats(),
        staleTime: 60 * 1000, // 1 minute
    });
}

export function useAdminUsers(params?: UserQueryParams) {
    console.log('[useAdminUsers] Hook called with params:', params);

    const result = useQuery({
        queryKey: ['admin', 'users', params],
        queryFn: async () => {
            console.log('[useAdminUsers] Query function executing...');
            try {
                const data = await adminService.listUsers(params);
                console.log('[useAdminUsers] Query success:', data);
                return data;
            } catch (error) {
                console.error('[useAdminUsers] Query error:', error);
                throw error;
            }
        },
    });

    console.log('[useAdminUsers] Query result:', {
        isLoading: result.isLoading,
        isFetching: result.isFetching,
        isError: result.isError,
        data: result.data,
        error: result.error,
    });

    return result;
}

export function useAdminUser(id: string) {
    return useQuery({
        queryKey: ['admin', 'user', id],
        queryFn: () => adminService.getUserById(id),
        enabled: !!id,
    });
}

export function useAdminUserMutations() {
    const queryClient = useQueryClient();

    const createUser = useMutation({
        mutationFn: (data: CreateUserRequest) => adminService.createUser(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        },
    });

    const updateUser = useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) =>
            adminService.updateUser(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'user', data.id] });
        },
    });

    const assignRole = useMutation({
        mutationFn: ({ userId, data }: { userId: string; data: AssignRoleRequest }) =>
            adminService.assignRole(userId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'user', variables.userId] });
        },
    });

    const updateUserStatus = useMutation({
        mutationFn: ({ userId, active }: { userId: string; active: boolean }) =>
            adminService.updateUserStatus(userId, active),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'user', data.id] });
        },
    });

    const updateUserRole = useMutation({
        mutationFn: ({ userId, roleCode }: { userId: string; roleCode: string }) =>
            adminService.updateUserRole(userId, roleCode),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'user', data.id] });
        },
    });

    const deactivateUser = useMutation({
        mutationFn: (userId: string) => adminService.deactivateUser(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        },
    });

    const activateUser = useMutation({
        mutationFn: (userId: string) => adminService.activateUser(userId),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'user', data.id] });
        },
    });

    const deleteUser = useMutation({
        mutationFn: (userId: string) => adminService.deleteUser(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
        },
    });

    return { 
        createUser, 
        updateUser, 
        assignRole, 
        updateUserStatus, 
        updateUserRole,
        deactivateUser,
        activateUser,
        deleteUser,
    };
}

export function useUserAuditTrail(userId: string) {
    return useQuery({
        queryKey: ['admin', 'user', userId, 'audit'],
        queryFn: () => adminService.listAccessLogs({
            resourceId: userId,
            resourceType: 'User',
            take: 20
        }),
        enabled: !!userId,
    });
}

export function useAdminTheaters() {
    return useQuery({
        queryKey: ['admin', 'theaters'],
        queryFn: () => adminService.listTheaters(),
    });
}

export function useAdminTheaterMutations() {
    const queryClient = useQueryClient();

    const createTheater = useMutation({
        mutationFn: (data: any) => adminService.createTheater(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'theaters'] });
        },
    });

    const updateTheater = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            adminService.updateTheater(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'theaters'] });
        },
    });

    return { createTheater, updateTheater };
}

export function useAdminAuditLogs() {
    return useQuery({
        queryKey: ['admin', 'audit'],
        queryFn: () => adminService.listDomainEvents({ take: 10 }), // Default to recent
    });
}

export function useAdminDepartments() {
    return useQuery({
        queryKey: ['admin', 'departments'],
        queryFn: () => adminService.listDepartments(),
    });
}

export function useAdminDepartmentMutations() {
    const queryClient = useQueryClient();

    const createDepartment = useMutation({
        mutationFn: (data: any) => adminService.createDepartment(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] });
        },
    });

    const updateDepartment = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            adminService.updateDepartment(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'departments'] });
        },
    });

    return { createDepartment, updateDepartment };
}

export function useAdminRoles(includeInactive: boolean = false) {
    return useQuery({
        queryKey: ['admin', 'roles', { includeInactive }],
        queryFn: () => adminService.listRoles(includeInactive),
    });
}
