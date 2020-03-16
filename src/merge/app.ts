import Bluebird from 'bluebird';
import _ from 'lodash';
import { Collection } from 'mongodb';
import config from '../config';
import { duplicationsConfigs, relationsConfig, manualDuplicationChecks, updateIdRelationsConfig, preMergeMigrations } from './mergeConfigs';

// TODO make inserting only after merge migrations

export const app = async (sourceDb, targetDb, client) => {
    await Bluebird.each(config.MERGE_COLLECTIONS, async collectionName => {
        console.log(`////// Merging ${collectionName}`);

        const sourceDbCollection: Collection = sourceDb.collection(collectionName);
        const targetDbCollection: Collection = targetDb.collection(collectionName);

        const sourceDbDocuments: any[] = await sourceDbCollection.find({}).toArray();

        // ==========================================
        // Migration that depends on target db values
        // ==========================================
        if (preMergeMigrations[collectionName]) {
            await preMergeMigrations[collectionName](sourceDbCollection, targetDbCollection);
        }

        // =======================================================================================
        // Going throw each record for every collection to filter out duplicates and fix relations
        // =======================================================================================
        const documentsToInsert: any[] = (await Bluebird.mapSeries(sourceDbDocuments, async doc => {
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


                // ==============================================================================================
                // Deleting or updating relations depending on duplication case (id or other fields respectively)
                // ==============================================================================================
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