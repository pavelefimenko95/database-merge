export const extPermissions = {
    Admin: {
        cipKioskMode: false,
        editPTO: false,
        activeSchedule: false,
    },
    Dispatcher: {
        editPTO: false,
    },
    'Field Technician': {
        cipKioskMode: false,
        remoteKiosk: false,
        activeSchedule: false
    },
    Accounting: {
        projectsRead: false,
        cipFullAccess: false,
        equipmentRead: false,
        usersFullAccess: false,
        availabilityFullAccess: false,
        timeClockFullAccess: false,
        editPTO: false,
        holidaysCreate: false,
        holidaysEdit: false
    },
    'Fleet Maintenance': {
        cipKioskMode: false,
        cipProjectsFullAccess: false,
        equipmentFullAccess: false,
        availabilityRead: false,
        availabilityEquipmentEdit: false
    },
    'Project Management': {
        projectsFullAccess: false,
        worklogEdit: false,
        worklogEditSubmitted: false
    },
    'Machine Shop': {
        cipKioskMode: false
    }
};