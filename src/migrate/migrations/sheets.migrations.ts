import moment from 'moment';
import Bluebird from 'bluebird';
import { v4 as uuidv4 } from 'uuid';

export default async db => {
    const Sheets = db.collection('sheets');
    const Settings = db.collection('settings');
    const Projects = db.collection('projects');
    const Contractors = db.collection('contractors');

    const settings = await Settings.findOne({});

    const convertTime = (createdAt, hour, minute, amPm) => {
        const startOfDay = moment(createdAt).startOf('day');
        const momentTime = moment(`${hour}:${minute} ${amPm}`, 'hh:mm a');
        return moment(startOfDay).add({hours: momentTime.hours(), minutes: momentTime.minutes()}).toDate();
    };

    // duplicateNumber (noCheck: true)

    // equipment.XX.hours (regEx: true)
    try {
        await Bluebird.all((await Sheets.find({'equipment': {$exists: true}}).toArray()).map(async sheet => {
            try {
                let { equipment } = sheet;

                equipment.forEach(equipmentDef => {
                    let { hours } = equipmentDef;

                    if (hours) {
                        hours = hours[0];

                        if (hours) {
                            const start = convertTime(sheet.createdAt, hours.hourStart, hours.minuteStart, hours.amPmStart);
                            const end = convertTime(sheet.createdAt, hours.hourEnd, hours.minuteEnd, hours.amPmEnd);

                            equipmentDef.hours = {
                                start,
                                end,
                            };
                        } else {
                            delete equipmentDef.hours;
                        }
                    }
                });

                await Sheets.updateOne({
                    _id: sheet._id
                }, {
                    $set: {
                        equipment,
                    },
                });
            } catch(e) {
                console.error(e);
            }
        }));
    } catch(e) {
        console.error(e);
    }

    // equipment
    try {
        await Sheets.updateMany({
            equipment: {
                $exists: false,
            },
        }, {
            $set: {
                equipment: [],
            },
        });
    } catch(e) {
        console.error(e);
    }

    // forceAccount
    try {
        await Sheets.updateMany({
            forceAccount: {
                $exists: false,
            },
        }, {
            $set: {
                forceAccount: 'No'
            }
        });
    } catch(e) {
        console.error(e);
    }

    // grid (regEx: true)
    try {
        await Bluebird.all((await Sheets.find({}).toArray()).map(async sheet => {
            try {
                await Sheets.updateOne({
                    _id: sheet._id,
                }, {
                    $set: {
                        'grid.date': moment(sheet.createdAt).format('DD-MM-YYYY'),
                        'grid.position': 'EMPTY',
                    },
                })
            } catch(e) {
                console.error(e);
            }
        }));
    } catch(e) {
        console.error(e);
    }

    // grid position
    try {
        await Bluebird.each((await Sheets.find({}).toArray()), async sheet => {
            try {
                const sameDaySheetsPositions = (await Sheets.find({
                    createdAt: {
                        $gte: moment(sheet.createdAt).startOf('day').toDate(),
                        $lt: moment(sheet.createdAt).endOf('day').toDate(),
                    },
                    'grid.position': {
                        $ne: 'EMPTY',
                    },
                }).toArray())
                    .map(sheet => sheet.grid.position);

                const position = sameDaySheetsPositions.length ? (sameDaySheetsPositions.reduce((prev, next) => next > prev ? next : prev) + 1) : 0;

                await Sheets.updateOne({
                    _id: sheet._id,
                }, {
                    $set: {
                        'grid.position': position,
                    },
                })
            } catch(e) {
                console.error(e);
            }
        });
    } catch(e) {
        console.error(e);
    }

    // startTime - default value

    try {
        await Sheets.updateMany({
            startTime: {
                $exists: false,
            },
        }, {
            $set: {
                startTime: {
                    hourStart: settings.defaultDayTime.hour,
                    minuteStart: settings.defaultDayTime.minute,
                    amPmStart: settings.defaultDayTime.amPm,
                },
            },
        });
    } catch(e) {
        console.error(e);
    }

    // hours (converting to format)
    try {
        await Bluebird.all((await Sheets.find({
            hours: {
                $exists: true,
            }
        }).toArray()).map(async sheet => {
            try {
                let { hours } = sheet;
                hours = hours[0];

                if (hours) {
                    const start = convertTime(sheet.createdAt, hours.hourStart, hours.minuteStart, hours.amPmStart);
                    const end = convertTime(sheet.createdAt, hours.hourEnd, hours.minuteEnd, hours.amPmEnd);

                    await Sheets.updateOne({
                        _id: sheet._id,
                    }, {
                        $set: {
                            hours: {
                                start,
                                end,
                            },
                        },
                    });
                }
            } catch(e) {
                console.error(e);
            }
        }));
    } catch(e) {
        console.error(e);
    }

    // in case
    try {
        await Bluebird.all((await Sheets.find({
            hours: {
                $exists: false,
            },
            startTime: {
                $exists: true,
            },
        }).toArray()).map(async sheet => {
            try {
                let { startTime } = sheet;

                const start = convertTime(sheet.createdAt, startTime.hourStart, startTime.minuteStart, startTime.amPmStart);
                const end = moment(start).add({ hours: 2 }).toDate();

                await Sheets.updateOne({
                    _id: sheet._id,
                }, {
                    $set: {
                        hours: {
                            start,
                            end,
                        },
                    },
                });
            } catch(e) {
                console.error(e);
            }
        }));
    } catch(e) {
        console.error(e);
    }

    // hours - no default value logic

    // noteComments (noCheck: true)

    // notes
    try {
        await Sheets.updateMany({
            notes: null,
        }, {
            $set: {
                notes: '',
            },
        });
    } catch(e) {
        console.error(e);
    }

    // published
    try {
        await Sheets.updateMany({}, {
            $set: {
                published: false,
            },
        });
    } catch(e) {
        console.error(e);
    }

    // schedulerNotes
    try {
        await Sheets.updateMany({
            schedulerNotes: null,
        }, {
            $set: {
                schedulerNotes: '',
            },
        });
    } catch(e) {
        console.error(e);
    }

    // startTime - no default value logic

    // submittedAt (noCheck: true)

    // submittedBy (noCheck: true)

    // timeOfDay
    try {
        await Sheets.updateMany({
            timeOfDay: {
                $exists: false,
            },
        }, {
            $set: {
                timeOfDay: 'Day',
            },
        });
    } catch(e) {
        console.error(e);
    }

    // travelTime (noCheck: true, regEx: true)

    // unpublishedChanges
    try {
        await Sheets.updateMany({}, {
            $set: {
                unpublishedChanges: true,
            },
        });
    } catch(e) {
        console.error(e);
    }

    // weather
    try {
        await Bluebird.all((await Sheets.find({weather: {$ne: null}}).toArray()).map(async sheet => {
            try {
                const { weather } = sheet;

                const degreesMatch = weather.match(/\d\d Degrees/);
                const humidityMatch = weather.match(/\d\d% Humidity/);

                await Sheets.updateOne({
                    _id: sheet._id,
                }, {
                    $set: {
                        weather: {
                            humidity: humidityMatch ? humidityMatch[0].slice(0, 2) : null,
                            notes: weather || null,
                            temperature: [degreesMatch ? degreesMatch[0].slice(0, 2) : null],
                        },
                    }
                });
            } catch(e) {
                console.error(e);
            }
        }));
    } catch(e) {
        console.error(e);
    }

    // weather - no default value logic

    // workers
    try {
        await Bluebird.all((await Sheets.find({workers: {$exists: true}}).toArray()).map(async sheet => {
            try {
                sheet.workers.forEach(worker => {
                    worker.hours.forEach(hoursDef => {
                        const start = convertTime(sheet.createdAt, hoursDef.hourStart, hoursDef.minuteStart, hoursDef.amPmStart);
                        const end = convertTime(sheet.createdAt, hoursDef.hourEnd, hoursDef.minuteEnd, hoursDef.amPmEnd);

                        delete hoursDef.hourStart;
                        delete hoursDef.minuteStart;
                        delete hoursDef.amPmStart;
                        delete hoursDef.dayStart;
                        hoursDef.start = start;

                        delete hoursDef.hourEnd;
                        delete hoursDef.minuteEnd;
                        delete hoursDef.amPmEnd;
                        delete hoursDef.dayEnd;
                        hoursDef.end = end;

                        hoursDef.id = hoursDef.hoursId || uuidv4();
                        delete hoursDef.hoursId;

                        if (worker.hasOwnProperty('returnToShop')) {
                            hoursDef.returnToShop = worker.returnToShop;
                        }
                    });
                });
                await Sheets.updateOne({
                    _id: sheet._id,
                }, {
                    $set: {
                        workers: sheet.workers,
                    },
                });
            } catch(e) {
                console.error(e);
            }
        }));
    } catch(e) {
        console.error(e);
    }

    // workers default value
    try {
        await Sheets.updateMany({
            workers: {
                $exists: false
            },
        }, {
            $set: {
                workers: [],
            },
        });
    } catch(e) {
        console.error(e);
    }

    // submission clone
    const contractorsSubmissionClone = async (contractorId, sheetId) => {
        const contractor = await Contractors.findOne({_id: contractorId});
        delete contractor._id;
        contractor.submissionClone = true;
        contractor.oldContractorId = contractor.oldContractorId || contractorId;

        return Contractors.insertOne(contractor);
    };

    const projectsSubmissionClone = async (projectId, sheetId, contractorId) => {
        const project = await Projects.findOne({_id: projectId});
        delete project._id;
        delete project.contractor;
        project.oldProjectId = project.oldProjectId || projectId;
        project.contractorId = contractorId;
        project.submissionClone = true;

        return Projects.insertOne(project);
    };

    // await Bluebird.mapSeries((await Sheets.find({
    //     $or: [
    //         { submittedAt: { $exists: true } },
    //         { publishedAt: true },
    //     ]
    // }).toArray()), async sheet => {
    //     const project = await Projects.findOne({
    //         _id: sheet.projectId,
    //     });
    //
    //     if (project && !project.submissionClone) {
    //         let updates: any = {};
    //         updates.contractorId = (await contractorsSubmissionClone(sheet.contractorId, sheet._id)).insertedId.toString();
    //         updates.projectId = (await projectsSubmissionClone(sheet.projectId, sheet._id, updates.contractorId)).insertedId.toString();
    //         await Sheets.updateOne({
    //             _id: sheet._id,
    //         }, { $set: updates });
    //     }
    // });
};
