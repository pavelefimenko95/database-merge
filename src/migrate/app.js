import Promise from 'bluebird';
import { getMigrateFields } from './getMigrateFields';
import { getDefaultValueConfig } from './libs/getDefaultValueConfig';

export const app = async (sourceDb, targetDb, client) => {
    const startTime = Date.now();

    const migrateFields = await getMigrateFields(sourceDb, targetDb);
    console.log(`Fields to migrate count: `, migrateFields.reduce((prev, next) => (Number.isInteger(prev) ? prev : prev.migrateFieldsDefs.length) + (Number.isInteger(next) ? next : next.migrateFieldsDefs.length)));

    migrateFields.forEach(({migrateFieldsDefs, collectionName}) => {
        console.log(`////// ${collectionName} collection diffs`);
        if(migrateFieldsDefs.length) {
            migrateFieldsDefs.forEach(def => console.log(`Field: ${def.fieldName} (${def.description})`));
        } else {
            console.log('No fields to migrate');
        }
    });

    await Promise.each(migrateFields, async ({collectionName, migrateFieldsDefs}) => {
        console.log(`////// Migrating collection: ${collectionName}`);
        if (migrateFieldsDefs.length) {

            const collection = sourceDb.collection(collectionName);
            const migrationFunction = getDefaultValueConfig(collectionName);

            if (typeof migrationFunction === 'function') {
                await migrationFunction(sourceDb);
            } else {
                await Promise.each(migrateFieldsDefs, async def => {

                    const fieldConfigs = getDefaultValueConfig(collectionName, def.fieldName);

                    await Promise.each(fieldConfigs, async config => {
                        const toUpdate = config.overrideToUpdate ? config.value : {
                            [config.delete ? '$unset' : '$set']: {
                                [def.fieldName]: config.value
                            }
                        };

                        !config.noCheck && await collection.updateMany(config.selector, config.aggregation ? [toUpdate] : toUpdate);
                    })
                });
            }
        }
    });
    console.log(`MIGRATION COMPLETED in ${((Date.now() - startTime) / 1000).toFixed(0)} sec`);
    client.close();
};