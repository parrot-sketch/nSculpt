import {
    LayoutDashboard,
    Calendar,
    CalendarPlus,
    Users,
    UserPlus,
    Scissors,
    ArrowRight,
    DollarSign,
    CheckCircle,
    ClipboardList,
} from 'lucide-react';

export interface NavItem {
    label: string;
    icon: any;
    href: string;
    badge?: number;
}

export interface NavSection {
    title: string;
    items: NavItem[];
}

/**
 * Front Desk Navigation Configuration
 * 
 * Reflects real clinic operational workflows:
 * - Operations (Dashboard, Queue)
 * - Appointments (View, Book)
 * - Patients (List, Register)
 * - Scheduling (Procedures, Follow-ups)
 * - Billing (Limited view)
 */
export const frontDeskNavigation: NavSection[] = [
    {
        title: 'Operations',
        items: [
            {
                label: 'Dashboard',
                icon: LayoutDashboard,
                href: '/frontdesk',
            },
            {
                label: 'Queue',
                icon: Users,
                href: '/frontdesk/queue',
            },
        ],
    },
    {
        title: 'Appointments',
        items: [
            {
                label: 'All Appointments',
                icon: Calendar,
                href: '/frontdesk/appointments',
            },
            {
                label: 'Book Appointment',
                icon: CalendarPlus,
                href: '/frontdesk/appointments/book',
            },
        ],
    },
    {
        title: 'Patients',
        items: [
            {
                label: 'Patient List',
                icon: ClipboardList,
                href: '/frontdesk/patients',
            },
            {
                label: 'Register Patient',
                icon: UserPlus,
                href: '/frontdesk/patients/new',
            },
        ],
    },
    {
        title: 'Scheduling',
        items: [
            {
                label: 'Procedure Plans',
                icon: Scissors,
                href: '/frontdesk/scheduling/procedures',
            },
            {
                label: 'Follow-ups',
                icon: ArrowRight,
                href: '/frontdesk/scheduling/follow-ups',
            },
        ],
    },
    {
        title: 'Billing',
        items: [
            {
                label: 'Unpaid',
                icon: DollarSign,
                href: '/frontdesk/billing/unpaid',
            },
            {
                label: 'Paid Today',
                icon: CheckCircle,
                href: '/frontdesk/billing/today',
            },
        ],
    },
];
