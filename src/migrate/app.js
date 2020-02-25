import Promise from 'bluebird';
import { getMigrateFields } from './getMigrateFields';
import { getDefaultValueConfig } from './libs/getDefaultValueConfig';

export const app = async (sourceDb, targetDb, client) => {
    await Promise.each(await getMigrateFields(sourceDb, targetDb), async ({collectionName, migrateFieldsDefs}) => {
        console.log(`Migrating collection: ${collectionName}`);
        if (migrateFieldsDefs.length) {
            const collection = sourceDb.collection(collectionName);
            await Promise.each(migrateFieldsDefs, async def => {
                console.log(`Field: ${def.fieldName} (${def.description})`);

                // const fieldConfigs = getDefaultValueConfig(collectionName, def.fieldName);

                // await Promise.each(fieldConfigs, config => {
                //     const toUpdate = {
                //         [config.delete ? '$unset' : '$set']: {
                //             [def.fieldName]: config.value
                //         }
                //     };
                //
                //     !config.noCheck && collection.updateMany(config.selector, config.aggregation ? [toUpdate] : toUpdate);
                // })
            });
        } else {
            console.log('No fields to migrate');
        }
    });
    console.log('MIGRATION COMPLETED');
    client.close();
};