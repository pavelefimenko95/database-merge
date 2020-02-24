import path from 'path';
import { execSync } from 'child_process';
import config from '../../config/index';

export const getMigrateFields = () =>
    config.COLLECTIONS.map(collectionName => {
        const sourceDbSchemaJSON = execSync(`mongo ${config.SOURCE_DB} --port ${config.DB_PORT} --quiet --eval "var collection = '${collectionName}', outputFormat='json'" ${path.resolve(__dirname, './libs/variety.js')}`).toString();
        const targetDbSchemaJSON = execSync(`mongo ${config.TARGET_DB} --port ${config.DB_PORT} --quiet --eval "var collection = '${collectionName}', outputFormat='json'" ${path.resolve(__dirname, './libs/variety.js')}`).toString();
        const sourceDbSchema = JSON.parse(sourceDbSchemaJSON);
        const targetDbSchema = JSON.parse(targetDbSchemaJSON);

        const fieldsSpecificToSourceDb = sourceDbSchema.filter(outerFieldDef =>
            !targetDbSchema.some(innerFieldDef => innerFieldDef._id.key === outerFieldDef._id.key)
        );
        if (fieldsSpecificToSourceDb.length) {
            throw new Error(`SOURCE_DB cannot have fields that don't exist in TARGET_DB`);
        }

        const fieldsRequireTypeChange = sourceDbSchema.filter(outerFieldDef =>
            !targetDbSchema.some(innerFieldDef =>
                innerFieldDef._id.key === outerFieldDef._id.key && JSON.stringify(Object.keys(innerFieldDef.value.types)) === JSON.stringify(Object.keys(outerFieldDef.value.types))
            )
        );
        if (fieldsRequireTypeChange.length) {
            throw new Error(`SOURCE_DB cannot have fields that don't match by type with the ones in TARGET_DB (type change isn't supported)`);
        }

        const fieldsSpecificToTargetDb = targetDbSchema.filter(outerFieldDef =>
            !sourceDbSchema.some(innerFieldDef => innerFieldDef._id.key === outerFieldDef._id.key)
        );

        return {
            collectionName,
            migrateFieldsDefs: fieldsSpecificToTargetDb
                .map(def => ({
                    fieldName: def._id.key,
                    types: Object.keys(def.value.types),
                }))
                .sort((prev, next) => prev.fieldName.localeCompare(next.fieldName))
        };
    });