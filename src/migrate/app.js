import Promise from 'bluebird';
import { getMergeFields } from './getMergeFields';
import { getDefaultValueConfig } from './libs/getDefaultValueConfig';

export const app = async (sourceDb, targetDb, client) => {
    await Promise.each(getMergeFields(), async ({collectionName, mergeFieldsDefs}) => {
        const collection = sourceDb.collection(collectionName);
        await Promise.each(mergeFieldsDefs, async def => {
            console.log(def.fieldName);

            const fieldConfigs = getDefaultValueConfig(collectionName, def.fieldName);
            // console.log(fieldConfigs);

            // Promise.each(fieldConfigs, config =>
            //     !config.noCheck && collection.update(config.selector, {
            //         $set: {
            //             [def.fieldName]: config.value
            //         }
            //     }, { multi: true })
            // )
        });
    });

    client.close();
};