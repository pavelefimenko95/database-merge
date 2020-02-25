import path from 'path';
import Promise from 'bluebird';
import { execSync } from 'child_process';
import config from '../../config/index';

export const getMigrateFields = (sourceDb, targetDb) =>
    Promise.mapSeries(config.COLLECTIONS, async collectionName => {
        const sourceDbSchemaJSON = execSync(`mongo ${config.SOURCE_DB} --port ${config.DB_PORT} --quiet --eval "var collection = '${collectionName}', outputFormat='json'" ${path.resolve(__dirname, './libs/variety.js')}`).toString();
        const targetDbSchemaJSON = execSync(`mongo ${config.TARGET_DB} --port ${config.DB_PORT} --quiet --eval "var collection = '${collectionName}', outputFormat='json'" ${path.resolve(__dirname, './libs/variety.js')}`).toString();
        const sourceDbSchema = JSON.parse(sourceDbSchemaJSON);
        const targetDbSchema = JSON.parse(targetDbSchemaJSON);

        // adding undefined type
        await Promise.each(sourceDbSchema, async def => {
            const collection = sourceDb.collection(collectionName);
            const documentsWithoutField = await collection.find({
                [def._id.key]: {
                    $exists: false
                }
            }).toArray();
            if (documentsWithoutField.length) {
                def.value.types["Undefined"] = documentsWithoutField.length;
            }
        });
        await Promise.each(targetDbSchema, async def => {
            const collection = targetDb.collection(collectionName);
            const documentsWithoutField = await collection.find({
                [def._id.key]: {
                    $exists: false
                }
            }).toArray();
            if (documentsWithoutField.length) {
                def.value.types["Undefined"] = documentsWithoutField.length;
            }
        });

        const fieldsSpecificToSourceDb = sourceDbSchema.filter(outerFieldDef =>
            !targetDbSchema.some(innerFieldDef => innerFieldDef._id.key === outerFieldDef._id.key)
        );
        if (fieldsSpecificToSourceDb.length) {
            throw new Error(`SOURCE_DB ("${collectionName}") cannot have fields that don't exist in TARGET_DB`);
        }

        const fieldsRequireTypeChange = sourceDbSchema.filter(outerFieldDef =>
            targetDbSchema.some(innerFieldDef => {
                const isMatched = innerFieldDef._id.key === outerFieldDef._id.key && JSON.stringify(Object.keys(innerFieldDef.value.types).sort()) !== JSON.stringify(Object.keys(outerFieldDef.value.types).sort());
                if (isMatched) {
                    outerFieldDef.changeTypeTo = innerFieldDef.value.types;
                }
                return isMatched;
            })
        );
        if (fieldsRequireTypeChange.length) {
            console.warn(`SOURCE_DB ("${collectionName}") has fields that don't match by type with the ones in TARGET_DB: ${fieldsRequireTypeChange.map(i => i._id.key)}`);
        }

        const fieldsSpecificToTargetDb = targetDbSchema.filter(outerFieldDef =>
            !sourceDbSchema.some(innerFieldDef => innerFieldDef._id.key === outerFieldDef._id.key)
        );

        const migrateFieldsDefs = [
            ...fieldsSpecificToTargetDb.map(item => ({...item, description: 'to add'})),
            ...fieldsRequireTypeChange.map(item => ({...item, description: `change type from ${JSON.stringify(item.value.types)} to ${JSON.stringify(item.changeTypeTo)}`})),
        ]
            .map(def => ({
                fieldName: def._id.key,
                types: Object.keys(def.value.types),
                description: def.description,
            }))
            .sort((prev, next) => prev.fieldName.localeCompare(next.fieldName));


        return {
            collectionName,
            migrateFieldsDefs,
        };
    });