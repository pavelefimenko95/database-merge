import moment from 'moment';
import Bluebird from 'bluebird';

export const duplicationsConfigs = {
    'users': [
        '_id',
        'username',
    ],
    'calendarEvents': [
        '_id',
    ],
    'cipHours': [
        '_id',
        [
            'timeclockId',
            'userId',
            'cipProjectId',
        ],
    ],
    'cipProjects': [
        '_id',
        'name',
    ],
    'sheets': [
        '_id',
        [
            'contractorId',
            'projectId',
            'hours.start',
            'hours.end',
        ],
    ],
    'contractors': [
        '_id',
        'name',
    ],
    'equipment': [
        '_id',
        [
            'name',
            'number',
        ],
    ],
    'manufacturers': [
        '_id',
        'name',
    ],
    'notes': [
        '_id',
    ],
    'plannedSheets': [
        '_id',
    ],
    'projects': [
        '_id',
        'jobNumber',
    ],
    'submissions': [
        '_id',
    ],
    'timeclock': [
        '_id',
    ],
};

// cipProjects - name
// contractor - name
// equipment - (name, number)
// manufacturers - name?
// materials, material-options - no check ?
// projects - jobNumber

export const relationsConfig = {
    // 'calendarEvents': [
    //     {
    //         belongsTo: 'users',
    //         foreignKey: 'resourceId',
    //     },
    //     {
    //         belongsTo: 'equipment',
    //         foreignKey: 'resourceId',
    //     },
    // ],
    // 'cipHours': [
    //     {
    //         belongsTo: 'cipProjects',
    //         foreignKey: 'cipProjectId',
    //     },
    // ],
    // 'notes': [
    //     {
    //         belongsTo: 'projects',
    //         foreignKey: 'projectId',
    //     },
    // ],
    // 'plannedSheets': [
    //     {
    //         belongsTo: 'projects',
    //         foreignKey: 'projectId',
    //     },
    //     {
    //         belongsTo: 'contractors',
    //         foreignKey: 'contractorId',
    //     },
    // ],
    // 'sheets': [
    //     {
    //         belongsTo: 'projects',
    //         foreignKey: 'projectId',
    //     },
    //     {
    //         belongsTo: 'contractors',
    //         foreignKey: 'contractorId',
    //     },
    // ],

    'submissions': [
        {
            belongsTo: 'sheets',
            foreignKey: 'sheetId',
        },
    ],
    // 'timeclock': [
    //     {
    //         belongsTo: 'users',
    //         foreignKey: 'userId',
    //     },
    // ],
};

export const updateIdRelationsConfig = {
    'projects': [
        {
            belongsTo: 'contractors',
            foreignKey: 'contractorId',
        },
    ],
    'sheets': [
        {
            belongsTo: 'projects',
            foreignKey: 'projectId',
        },
        {
            belongsTo: 'contractors',
            foreignKey: 'contractorId',
        },
    ],
    'plannedSheets': [
        {
            belongsTo: 'projects',
            foreignKey: 'projectId',
        },
        {
            belongsTo: 'contractors',
            foreignKey: 'contractorId',
        },
    ],
    'notes': [
        {
            belongsTo: 'projects',
            foreignKey: 'projectId',
        },
    ],
};

export const manualDuplicationChecks = {
    'calendarEvents': async (doc, targetDbCollection, targetDb): Promise<boolean> => {
        const timeoffsCollection: any = targetDb.collection('timeoffs');

        const isCalendarEventsDuplicate: boolean = !!await targetDbCollection.findOne({
            $or: [
                {_id: doc._id},
                {
                    start: doc['start'],
                    end: doc['end'],
                    resourceId: doc['resourceId'],
                }
            ],
        });

        const startFormatted: string = moment(doc['start'], 'YYYY-MM-DD').format('DD/MM/YYYY');

        const isTimeoffsDuplicate: boolean = !!await timeoffsCollection.findOne({
            inDays: startFormatted,
            userId: doc['resourceId'],
        });

        return isCalendarEventsDuplicate || isTimeoffsDuplicate;
    },
};

// export const manualRelationsChecks = {
//     'sheets': async (doc, sourceDbCollection, sourceDb): Promise<void> => {
//         const Projects = sourceDb.collection('projects');
//         const Contractors = sourceDb.collection('contractors');
//
//         await Projects.deleteMany({
//             submissionClone: true,
//             oldProjectId: doc.projectId,
//         });
//         await Contractors.deleteMany({
//             submissionClone: true,
//             oldContractorId: doc.contractorId,
//         });
//     },
// };

export const preMergeMigrations = {
    'sheets': async (sourceDbCollection, targetDbCollection): Promise<void> => {
        await sourceDbCollection.updateMany({}, {
            $unset: {
                'grid.position': 1,
            },
        });

        await Bluebird.each((await sourceDbCollection.find({}).toArray()), (async sheet => {
            const sameDaySheetsPositions = ([
                ...await targetDbCollection.find({
                    createdAt: {
                        $gte: moment(sheet.createdAt).startOf('day').toDate(),
                        $lt: moment(sheet.createdAt).endOf('day').toDate(),
                    },
                    'grid.position': {
                        $exists: true,
                    },
                }).toArray(),
                ...await sourceDbCollection.find({
                    createdAt: {
                        $gte: moment(sheet.createdAt).startOf('day').toDate(),
                        $lt: moment(sheet.createdAt).endOf('day').toDate(),
                    },
                    'grid.position': {
                        $exists: true,
                    },
                }).toArray(),
            ])
                .map(sheet => sheet.grid.position);

            const position: number = sameDaySheetsPositions.length ? (sameDaySheetsPositions.reduce((prev, next) => next > prev ? next : prev) + 1) : 0;

            await sourceDbCollection.updateOne({
                _id: sheet._id,
            }, {
                $set: {
                    'grid.position': position,
                },
            });
        }));
    },
};