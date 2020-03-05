import Promise from 'bluebird';
import _ from 'lodash';
import moment from 'moment';
import config from '../../config';
import { duplicationsConfigs, relationsConfig } from './mergeConfigs';

export const app = async (sourceDb, targetDb, client) => {
    await Promise.each(config.MERGE_COLLECTIONS, async collectionName => {
        console.log(`////// Merging ${collectionName}`);

        const sourceDbCollection = sourceDb.collection(collectionName);
        const targetDbCollection = targetDb.collection(collectionName);

        const sourceDbDocuments = await sourceDbCollection.find({}).toArray();

        const documentsToInsert = (await Promise.mapSeries(sourceDbDocuments, async doc => {
            let isDuplicate;

            if (collectionName === 'calendarEvents') {
                const timeoffsCollection = targetDb.collection('timeoffs');

                const isCalendarEventsDuplicate = await targetDbCollection.findOne({
                    $or: [
                        {_id: doc._id},
                        {
                            start: doc['start'],
                            end: doc['end'],
                            resourceId: doc['resourceId'],
                        }
                    ],
                });

                const startFormatted = moment(doc['start'], 'YYYY-MM-DD').format('DD/MM/YYYY');

                const isTimeoffsDuplicate = await timeoffsCollection.findOne({
                    inDays: startFormatted,
                    userId: doc['resourceId'],
                });

                isDuplicate = isCalendarEventsDuplicate || isTimeoffsDuplicate;
            } else {
                const duplicationsConfig = duplicationsConfigs[collectionName];

                isDuplicate = duplicationsConfig && !!await targetDbCollection.findOne({
                    $or: duplicationsConfig.map(duplicationDef => {
                        let condition = {};

                        if (typeof duplicationDef === 'string' && doc[duplicationDef]) {
                            condition[duplicationDef] = doc[duplicationDef];
                        } else {
                            duplicationDef.forEach(fieldName => {
                                if(_.get(doc, fieldName)) {
                                    _.set(condition, fieldName,  _.get(doc, fieldName));
                                }
                            });
                        }

                        return condition;
                    }),
                });
            }

            if (isDuplicate) {
                await sourceDbCollection.deleteOne({
                    _id: doc._id,
                });

                const dependantRelations = Object
                    .keys(relationsConfig)
                    .map(collection => {
                        const relations = relationsConfig[collection];
                        return relations
                            .filter(relation => relation.belongsTo === collectionName)
                            .map(relation => ({
                                ...relation,
                                collection,
                            }));
                    })
                    .reduce((prev, next) => [...prev, ...next], []);

                await Promise.all(dependantRelations.map(({collection, foreignKey}) =>
                    sourceDb.collection(collection).deleteMany({
                        [foreignKey]: doc._id,
                    })
                ));
            }

            return !isDuplicate && doc;
        })).filter(v => v);

        documentsToInsert.length && await targetDbCollection.insertMany(documentsToInsert);

        console.log(`Inserted ${documentsToInsert.length} ${collectionName} out of ${sourceDbDocuments.length}`);
    });
    client.close();
};