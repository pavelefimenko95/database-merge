import Promise from 'bluebird';
import config from '../../config';
import { duplicationsConfigs } from './duplicationsConfig';

export const app = async (sourceDb, targetDb, client) => {
    await Promise.each(config.COLLECTIONS, async collectionName => {
        console.log(`////// Merging ${collectionName}`);

        const sourceDbCollection = sourceDb.collection(collectionName);
        const targetDbCollection = targetDb.collection(collectionName);

        const sourceDbDocuments = await sourceDbCollection.find({}).toArray();

        const documentsToInsert = (await Promise.mapSeries(sourceDbDocuments, async doc => {
            const duplicationsConfig = duplicationsConfigs[collectionName];

            const isDuplicate = duplicationsConfig && !!await targetDbCollection.findOne({
                $or: duplicationsConfig.map(fieldName => ({
                    [fieldName]: doc[fieldName],
                })),
            });

            return !isDuplicate && doc;
        })).filter(v => v);

        documentsToInsert.length && await targetDbCollection.insertMany(documentsToInsert);

        console.log(`Inserted ${documentsToInsert.length} ${collectionName} out of ${sourceDbDocuments.length}`);
    });
    client.close();
};