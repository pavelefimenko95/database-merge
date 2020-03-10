import Bluebird from 'bluebird';
import _ from 'lodash';
import config from '../config';
import { duplicationsConfigs, relationsConfig, manualDuplicationChecks, manualRelationsChecks, updateIdRelationsConfig, preMergeMigrations } from './mergeConfigs';

export const app = async (sourceDb, targetDb, client) => {
    await Bluebird.each(config.MERGE_COLLECTIONS, async collectionName => {
        console.log(`////// Merging ${collectionName}`);

        const sourceDbCollection = sourceDb.collection(collectionName);
        const targetDbCollection = targetDb.collection(collectionName);

        const sourceDbDocuments = await sourceDbCollection.find({}).toArray();

        if (preMergeMigrations[collectionName]) {
            await preMergeMigrations[collectionName](sourceDbCollection, targetDbCollection);
        }

        const documentsToInsert = (await Bluebird.mapSeries(sourceDbDocuments, async doc => {
            let isDuplicate: boolean;
            let duplicatedRecord;

            if (manualDuplicationChecks[collectionName]) {
                isDuplicate = await manualDuplicationChecks[collectionName](doc, targetDbCollection, targetDb);
            } else {
                const duplicationsConfig = duplicationsConfigs[collectionName];

                duplicatedRecord = await targetDbCollection.findOne({
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

                isDuplicate = duplicationsConfig && !!duplicatedRecord;
            }

            if (isDuplicate) {
                await sourceDbCollection.deleteOne({
                    _id: doc._id,
                });

                // const manualRelationsCheck = manualRelationsChecks[collectionName];
                // manualRelationsCheck && await manualRelationsCheck(doc, sourceDbCollection, sourceDb);

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

                const updateIdDependantRelations = Object
                    .keys(updateIdRelationsConfig)
                    .map(collection => {
                        const relations = updateIdRelationsConfig[collection];
                        return relations
                            .filter(relation => relation.belongsTo === collectionName)
                            .map(relation => ({
                                ...relation,
                                collection,
                            }));
                    })
                    .reduce((prev, next) => [...prev, ...next], []);

                await Bluebird.all(dependantRelations.map(({collection, foreignKey}) =>
                    sourceDb.collection(collection).deleteMany({
                        [foreignKey]: doc._id,
                    })
                ));

                duplicatedRecord && await Bluebird.all(updateIdDependantRelations.map(({collection, foreignKey}) =>
                    sourceDb.collection(collection).updateMany({
                        [foreignKey]: doc._id,
                    }, {
                        $set: {
                            [foreignKey]: duplicatedRecord._id,
                        },
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