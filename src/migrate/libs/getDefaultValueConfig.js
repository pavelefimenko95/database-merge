import _ from 'lodash';
import { extPermissions } from './helperData';
import sheetsMigration from '../migrations/sheets.migrations';

// ==============================
// Additional props
// ==============================
// noCheck - skip migration for this field
// regExp - allow this field to be searched by regexp if no exact matches found
// delete - delete field
// aggregation - is toUpdate contains aggregation
// overrideToUpdate - overrides default $set

const config = {
    users: {
        'deleted': {
            noCheck: true,
        },
        'profile.admin': {
            noCheck: true,
        },
        'profile.isPTOAdmin': {
            noCheck: true,
        },
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
        'profile.role.': {
            regExp: true,
            noCheck: true,
        },
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
        'profile.timeoff.': {
            regExp: true,
            noCheck: true,
        },
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
        'nickname': {
            noCheck: true,
        },
        'oldContractorId': {
            noCheck: true,
        },
        'submissionClone': {
            noCheck: true,
        },
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
        'discrete': {
            noCheck: true,
        },
        'line.description': {
            noCheck: true,
        },
        'other': {
            regExp: true,
            noCheck: true,
        },
    },
    projects: {
        'baseRate': {
            noCheck: true,
        },
        'fringeBenefit': {
            noCheck: true,
        },
        'earningsCode': {
            noCheck: true,
        },
        'oldProjectId': {
            noCheck: true,
        },
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
        'submissionClone': {
            noCheck: true,
        },
        'travelTime': {
            noCheck: true,
            regExp: true,
        },
        'wages': {
            noCheck: true,
        },
    },
    settings: {
        'allowedTimeoff': {
            selector: {},
            value: 0,
        },
    },
    sheets: sheetsMigration,
    submissions: {
        'signatures.dot.time': {
            noCheck: true,
        },
        'processed': {
            selector: {},
            value: '',
            delete: true,
        },
        'toEmail': {
            noCheck: true,
        },
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

    if (!fieldName) {
        return collectionConfig;
    } else {
        const fieldConfigs = collectionConfig[fieldName];
        if (!fieldConfigs || !fieldConfigs.length) {
            const fieldConfigKeys = Object
                .keys(collectionConfig)
                .filter(key =>
                    (new RegExp(key)).test(fieldName) && collectionConfig[key].every(fieldConfig => fieldConfig.regExp)
                );

            if (fieldConfigKeys.length !== 1) {
                throw new Error(`No default value config for "${fieldName}"`);
            } else {
                return collectionConfig[fieldConfigKeys[0]];
            }
        }
        return fieldConfigs;
    }
};