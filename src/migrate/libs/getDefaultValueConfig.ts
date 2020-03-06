import _ from 'lodash';
import { extPermissions } from './helperData';
import sheetsMigration from '../migrations/sheets.migrations';

// ==============================
// Additional props
// ==============================
// noCheck - skip migration for this field
// delete - delete field
// aggregation - is toUpdate contains aggregation
// overrideToUpdate - overrides default $set

const config = {
    users: {
        'deleted': {noCheck: true,},
        'profile.admin': {noCheck: true,},
        'profile.isPTOAdmin': {noCheck: true,},
        // from project migration
        'profile.role': [
            {
                selector: {
                    'profile.admin': true,
                },
                value: {
                    roleName: 'Admin',
                    extPermissions: extPermissions['Admin'],
                },
            },
            {
                selector: {
                    'profile.admin': false,
                },
                value: {
                    roleName: 'Field Technician',
                    extPermissions: extPermissions['Field Technician'],
                },
            }
        ],
        // from project migration
        'profile.shifts': {
            selector: {
                'profile.shifts': {
                    $exists: false
                },
            },
            value: {
                weekDays: 'Mon-Fri',
                timeOfDay: 'Day',
            },
        },
        // from project migration
        'profile.shifts.timeOfDay': {
            selector: {
                $or: [
                    { 'profile.shifts.timeOfDay': { $exists: false } },
                    { 'profile.shifts.timeOfDay': 'None' },
                    { 'profile.shifts.timeOfDay': '' },
                ]
            },
            value: 'Day',
        },
        // from project migration
        'profile.shifts.weekDays': [
            {
                selector: {
                    $or: [
                        { 'profile.shifts.weekDays': { $exists: false } },
                        { 'profile.shifts.weekDays': 'None' },
                        { 'profile.shifts.weekDays': '' },
                        { 'profile.shifts.weekDays': 'M-Th' },
                    ]
                },
                value: 'Mon-Fri',
            },
            {
                selector: {
                    'profile.shifts.weekDays': 'Th-Su',
                },
                value: 'Sun-Thu',
            }
        ],
        // from project migration
        'profile.timeoff': {
            selector: {},
            value: {
                allowedTime: 0
            },
        },
        'profile.role.extPermissions': {noCheck: true,},
        'profile.role.extPermissions.activeSchedule': {noCheck: true,},
        'profile.role.extPermissions.availabilityEquipmentEdit': {noCheck: true,},
        'profile.role.extPermissions.availabilityFullAccess': {noCheck: true,},
        'profile.role.extPermissions.availabilityRead': {noCheck: true,},
        'profile.role.extPermissions.cipFullAccess': {noCheck: true,},
        'profile.role.extPermissions.cipKioskMode': {noCheck: true,},
        'profile.role.extPermissions.cipProjectsFullAccess': {noCheck: true,},
        'profile.role.extPermissions.editPTO': {noCheck: true,},
        'profile.role.extPermissions.equipmentFullAccess': {noCheck: true,},
        'profile.role.extPermissions.equipmentRead': {noCheck: true,},
        'profile.role.extPermissions.holidaysCreate': {noCheck: true,},
        'profile.role.extPermissions.holidaysEdit': {noCheck: true,},
        'profile.role.extPermissions.projectsFullAccess': {noCheck: true,},
        'profile.role.extPermissions.projectsRead': {noCheck: true,},
        'profile.role.extPermissions.remoteKiosk': {noCheck: true,},
        'profile.role.extPermissions.timeClockFullAccess': {noCheck: true,},
        'profile.role.extPermissions.usersFullAccess': {noCheck: true,},
        'profile.role.extPermissions.worklogEdit': {noCheck: true,},
        'profile.role.extPermissions.worklogEditSubmitted': {noCheck: true,},
        'profile.role.roleName': {noCheck: true,},
        'profile.timeoff.allowedTime': {noCheck: true,},
        'profile.timeoff.availableTimeoffFromHoliday': {noCheck: true,},
    },
    cipProjects: {
        'description': {
            selector: {
                description: {
                    $exists: false,
                },
            },
            value: ''
        }
    },
    contractors: {
        'nickname': {noCheck: true,},
        'oldContractorId': {noCheck: true,},
        'submissionClone': {noCheck: true,},
    },
    equipment: {
        // from project migration
        'deleted': {
            selector: {
                deleted: {
                    $exists: true,
                    $ne: false,
                },
            },
            value: {
                $set: {
                    deletedAt: new Date(),
                },
                $unset: {
                    deleted: 1,
                },
            },
            overrideToUpdate: true,
        },
        // from project migration
        'deletedAt': {
            noCheck: true,
        },
        'yearMade': [
            {
                selector: {
                    yearMade: '',
                },
                value: '',
                delete: true,
            },
            {
                selector: {
                    yearMade: {
                        $exists: true,
                    },
                },
                value: {
                    $convert: {input: '$yearMade', to: 'int'},
                },
                aggregation: true,
            }
        ],
    },
    materials: {
        'discrete': {noCheck: true,},
        'line.description': {noCheck: true,},
        'other': {noCheck: true,},
        'other.quantity': {noCheck: true,},
    },
    projects: {
        'baseRate': {noCheck: true,},
        'fringeBenefit': {noCheck: true,},
        'earningsCode': {noCheck: true,},
        'oldProjectId': {noCheck: true,},
        // from project migration
        'rated': {
            selector: {
                rated: {
                    $exists: false
                },
            },
            value: false,
        },
        'shift': {
            selector: {},
            value: 'Day',
        },
        'submissionClone': {noCheck: true,},
        'travelTime': {noCheck: true,},
        'travelTime.hours': {noCheck: true,},
        'travelTime.minutes': {noCheck: true,},
        'wages': {noCheck: true,},
    },
    settings: {
        'allowedTimeoff': {
            selector: {},
            value: 0,
        },
    },
    sheets: sheetsMigration,
    submissions: {
        'signatures.dot.time': {noCheck: true,},
        'processed': {
            selector: {},
            value: '',
            delete: true,
        },
        'toEmail': {noCheck: true,},
    },
};

// ==============================
// Сonverting selector to array
// ==============================
const normalize = obj => {
    Object
        .keys(obj)
        .forEach(collectionName =>
            typeof obj[collectionName] !== 'function' && Object
                .keys(obj[collectionName])
                .forEach(fieldName => {
                    obj[collectionName][fieldName] = _.isPlainObject(obj[collectionName][fieldName]) ? [obj[collectionName][fieldName]] : obj[collectionName][fieldName]
                })
        );
    return obj;
};

export const getDefaultValueConfig = (collectionName, fieldName) => {
    const collectionConfig = normalize(config)[collectionName];

    if (!collectionConfig) {
        throw new Error(`No default value config for collection "${collectionName}"`);
    }

    return fieldName ? collectionConfig[fieldName] : collectionConfig;
};