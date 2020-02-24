import _ from 'lodash';
import { extPermissions } from './helperData';

const config = {
    users: {
        'deleted': {
            selector: {},
            value: false,
        },
        'profile.isPTOAdmin': {
            selector: {},
            value: false,
        },
        'profile.role': [
            {
                selector: {
                    'profile.admin': true
                },
                value: {
                    roleName: 'Admin',
                    extPermissions: extPermissions['Admin']
                },
            },
            {
                selector: {
                    'profile.admin': false
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
        }
    }
};

const normalize = obj => {
    Object
        .keys(obj)
        .forEach(collectionName =>
            Object
                .keys(obj[collectionName])
                .forEach(fieldName => {
                    obj[collectionName][fieldName] = _.isPlainObject(obj[collectionName][fieldName]) ? [obj[collectionName][fieldName]] : obj[collectionName][fieldName]
                })
        );
    return obj;
};

export const getDefaultValueConfig = (collectionName, fieldName) => {
    const collectionConfig = normalize(config)[collectionName];

    const fieldConfigs = collectionConfig[fieldName];
    if (!fieldConfigs || !fieldConfigs.length) {
        const fieldConfigKeys = Object
            .keys(collectionConfig)
            .filter(key =>
                (new RegExp(key)).test(fieldName) && collectionConfig[key].every(fieldConfig => fieldConfig.regExp)
            );

        if (fieldConfigKeys.length !== 1) {
            // throw new Error(`No default value config for "${fieldName}"`);
        } else {
            return collectionConfig[fieldConfigKeys[0]];
        }
    }
    return fieldConfigs;
};