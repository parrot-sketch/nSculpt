import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CreateUserRequest, UpdateUserRequest } from '@/types/admin';
import { useAdminDepartments, useAdminRoles } from '@/hooks/useAdminQuery';
import { User, Building2, Briefcase, Save, ArrowLeft } from 'lucide-react';

interface UserFormProps {
    initialData?: UpdateUserRequest & { id?: string };
    onSubmit: (data: CreateUserRequest | UpdateUserRequest) => Promise<void>;
    isLoading?: boolean;
    isEditMode?: boolean;
}

// Extracted Component to prevent re-mounting on every render
const InputField = ({
    label,
    name,
    value,
    onChange,
    onBlur,
    error,
    type = "text",
    required = false,
    placeholder = "",
    icon: Icon,
    disabled = false
}: {
    label: string,
    name: string,
    value: string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    onBlur: (field: string) => void,
    error?: string,
    type?: string,
    required?: boolean,
    placeholder?: string,
    icon?: any,
    disabled?: boolean
}) => (
    <div className="col-span-1">
        <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">
            {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <div className="relative rounded-md shadow-sm">
            {Icon && (
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                </div>
            )}
            <input
                type={type}
                name={name}
                id={name}
                required={required}
                value={value}
                onChange={onChange}
                onBlur={() => onBlur(name)}
                readOnly={disabled}
                placeholder={placeholder}
                className={`block w-full rounded-md border-slate-300 py-2.5 ${Icon ? 'pl-10' : 'pl-3'} pr-3 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 focus:border-transparent sm:text-sm sm:leading-6 shadow-sm transition-all duration-200
                    ${disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}
                    ${error ? 'border-rose-300 focus:ring-rose-500' : 'border-slate-200 hover:border-slate-300'}`}
            />
        </div>
        {error && (
            <p className="mt-1 text-xs text-rose-600 flex items-center animate-in slide-in-from-top-1">
                <span className="mr-1">⚠</span> {error}
            </p>
        )}
    </div>
);

export function UserForm({ initialData, onSubmit, isLoading = false, isEditMode = false }: UserFormProps) {
    const router = useRouter();
    const { data: departmentsResponse } = useAdminDepartments();
    const { data: roles } = useAdminRoles(false); // Fetch active roles only
    const departments = departmentsResponse?.data || [];

    // Initialize form data with defaults, then merge initialData if provided
    const [formData, setFormData] = useState<CreateUserRequest | UpdateUserRequest>(() => ({
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        title: '',
        employeeId: '',
        departmentId: '',
        roleId: '',
        active: true,
        ...initialData,
    }));

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    // Update form data when initialData changes (important for edit mode)
    useEffect(() => {
        if (initialData) {
            setFormData(prev => {
                // Merge initialData, ensuring departmentId and roleId are properly set
                const updated = {
                    ...prev,
                    ...initialData,
                    // Explicitly handle departmentId and roleId to ensure they're set correctly
                    departmentId: initialData.departmentId || prev.departmentId || '',
                    roleId: initialData.roleId || prev.roleId || '',
                    // Preserve active status
                    active: initialData.active !== undefined ? initialData.active : prev.active,
                };
                return updated;
            });
        }
    }, [initialData]);

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.email) newErrors.email = 'Email is required';
        if (!formData.firstName) newErrors.firstName = 'First Name is required';
        if (!formData.lastName) newErrors.lastName = 'Last Name is required';

        // Email validation
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email address';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleBlur = (field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }));
        validate();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched({
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            title: true,
            employeeId: true,
            departmentId: true,
        });

        if (!validate()) return;

        try {
            // Sanitize payload: convert empty strings to undefined for optional fields
            const payload = {
                ...formData,
                departmentId: formData.departmentId || undefined,
                roleId: formData.roleId || undefined,
                phone: formData.phone || undefined,
                title: formData.title || undefined,
                employeeId: formData.employeeId || undefined,
            };
            await onSubmit(payload);
        } catch (error) {
            console.error('Form submission error:', error);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));

        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
            {/* Header / Meta */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center space-x-2 text-slate-500">
                        <User className="h-5 w-5" />
                        <h3 className="text-base font-semibold leading-6 text-slate-900">
                            Identity & Contact
                        </h3>
                    </div>
                    <div className="flex items-center space-x-3 self-end sm:self-auto">
                        <span className="text-sm text-slate-500">Status</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                name="active"
                                checked={formData.active !== false}
                                onChange={handleChange}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                            <span className="ml-2 text-sm font-medium text-slate-700 w-16">
                                {formData.active !== false ? 'Active' : 'Inactive'}
                            </span>
                        </label>
                    </div>
                </div>

                <div className="p-6 grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
                    <InputField
                        label="First Name"
                        name="firstName"
                        value={formData.firstName || ''}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.firstName ? errors.firstName : undefined}
                        required
                        placeholder="e.g. John"
                    />
                    <InputField
                        label="Last Name"
                        name="lastName"
                        value={formData.lastName || ''}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.lastName ? errors.lastName : undefined}
                        required
                        placeholder="e.g. Doe"
                    />
                    <InputField
                        label="Email Address"
                        name="email"
                        type="email"
                        value={formData.email || ''}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.email ? errors.email : undefined}
                        required
                        placeholder="john.doe@hospital.com"
                        icon={Briefcase}
                        disabled={isEditMode}
                    />
                    <InputField
                        label="Phone Number"
                        name="phone"
                        type="tel"
                        value={formData.phone || ''}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.phone ? errors.phone : undefined}
                        placeholder="+254 7..."
                    />
                </div>
            </div>

            {/* Professional Info */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center space-x-2 text-slate-500">
                    <Building2 className="h-5 w-5" />
                    <h3 className="text-base font-semibold leading-6 text-slate-900">
                        Professional Details
                    </h3>
                </div>
                <div className="p-6 grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
                    <InputField
                        label="Job Title"
                        name="title"
                        value={formData.title || ''}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="e.g. Senior Surgeon"
                    />


                    <div className="col-span-1">
                        <label htmlFor="departmentId" className="block text-sm font-medium text-slate-700 mb-1">
                            Department
                        </label>
                        <select
                            id="departmentId"
                            name="departmentId"
                            value={formData.departmentId || ''}
                            onChange={handleChange}
                            className="block w-full rounded-md border-slate-300 py-2.5 pl-3 pr-10 text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:border-transparent sm:text-sm sm:leading-6 shadow-sm"
                        >
                            <option value="">Select a department...</option>
                            {departments.map((dept: any) => (
                                <option key={dept.id} value={dept.id}>
                                    {dept.name} ({dept.code})
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-slate-500">
                            Assigning a department helps with reporting and access control.
                        </p>
                    </div>

                    <div className="col-span-1">
                        <label htmlFor="roleId" className="block text-sm font-medium text-slate-700 mb-1">
                            Role (Access Level)
                        </label>
                        <select
                            id="roleId"
                            name="roleId"
                            value={formData.roleId || ''}
                            onChange={handleChange}
                            className="block w-full rounded-md border-slate-300 py-2.5 pl-3 pr-10 text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:border-transparent sm:text-sm sm:leading-6 shadow-sm"
                        >
                            <option value="">Select a role...</option>
                            {roles?.map((role: any) => (
                                <option key={role.id} value={role.id}>
                                    {role.name}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-slate-500">
                            Determines what the user can see and do in the system.
                        </p>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-x-4 pt-4 sticky bottom-0 bg-gray-50/80 backdrop-blur-sm p-4 -mx-4 sm:mx-0 sm:bg-transparent sm:p-0 border-t sm:border-t-0 border-gray-200">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors duration-200"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4" />
                            Save User
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
