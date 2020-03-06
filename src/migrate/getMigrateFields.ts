import path from 'path';
import Bluebird from 'bluebird';
import { exec } from 'child_process';
import config from '../config';

const execAsync = Bluebird.promisify(exec);

export const getMigrateFields = (sourceDb, targetDb) =>
    Bluebird.all(config.MIGRATE_COLLECTIONS.map(async collectionName => {
        const sourceDbSchemaJSON = (await execAsync(`mongo ${config.SOURCE_DB} --port ${config.DB_PORT} --quiet --eval "var collection = '${collectionName}', outputFormat='json'" ${path.resolve(__dirname, './libs/variety.js')}`)).toString();
        const targetDbSchemaJSON = (await execAsync(`mongo ${config.TARGET_DB} --port ${config.DB_PORT} --quiet --eval "var collection = '${collectionName}', outputFormat='json'" ${path.resolve(__dirname, './libs/variety.js')}`)).toString();

        const sourceDbSchema = JSON.parse(sourceDbSchemaJSON);
        const targetDbSchema = JSON.parse(targetDbSchemaJSON);

        // adding undefined type
        await Bluebird.each(sourceDbSchema, async def => {
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
        await Bluebird.each(targetDbSchema, async def => {
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

        const fieldsRequireTypeChange = sourceDbSchema.filter(outerFieldDef =>
            targetDbSchema.some(innerFieldDef => {
                const isMatched = innerFieldDef._id.key === outerFieldDef._id.key && JSON.stringify(Object.keys(innerFieldDef.value.types).sort()) !== JSON.stringify(Object.keys(outerFieldDef.value.types).sort());
                if (isMatched) {
                    outerFieldDef.changeTypeTo = innerFieldDef.value.types;
                }
                return isMatched;
            })
        );

        const fieldsSpecificToTargetDb = targetDbSchema.filter(outerFieldDef =>
            !sourceDbSchema.some(innerFieldDef => innerFieldDef._id.key === outerFieldDef._id.key)
        );

        const migrateFieldsDefs = [
            ...fieldsSpecificToSourceDb.map(item => ({...item, description: 'to delete'})),
            ...fieldsSpecificToTargetDb.map(item => ({...item, description: `to add, type: ${JSON.stringify(item.value.types)}`})),
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
    }));