import Promise from 'bluebird';
import { getMigrateFields } from './getMigrateFields';
import { getDefaultValueConfig } from './libs/getDefaultValueConfig';

export const app = async (sourceDb, targetDb, client) => {
    await Promise.each(getMigrateFields(), async ({collectionName, migrateFieldsDefs}) => {
        console.log(`Migrating collection: ${collectionName}`);
        if (migrateFieldsDefs.length) {
            const collection = sourceDb.collection(collectionName);
            await Promise.each(migrateFieldsDefs, async def => {
                console.log(def.fieldName);

                const fieldConfigs = getDefaultValueConfig(collectionName, def.fieldName);

                await Promise.each(fieldConfigs, config =>
                    !config.noCheck && collection.update(config.selector, {
                        $set: {
                            [def.fieldName]: config.value
                        }
                    }, { multi: true })
                )
            });
        } else {
            console.log('No fields to migrate');
        }
    });
    console.log('MIGRATION COMPLETED');
    client.close();
};