import moment from 'moment';
import uuid from 'uuid';

export default async db => {
    const Sheets = db.collection('sheets');

    const convertTime = (createdAt, hour, minute, amPm) => {
        const startOfDay = moment(createdAt).startOf('day');
        const momentTime = moment(`${hour}:${minute} ${amPm}`, 'hh:mm a');
        return moment(startOfDay).add({hours: momentTime.hours(), minutes: momentTime.minutes()}).toDate();
    };

    // duplicateNumber (noCheck: true)

    // equipment.XX.hours (regEx: true)
    await Promise.all((await Sheets.find({'equipment': {$exists: true}}).toArray()).map(async sheet => {
        let { equipment } = sheet;

        equipment.forEach(equipmentDef => {
            let { hours } = equipmentDef;

            if (hours) {
                hours = hours[0];
                const start = convertTime(sheet.createdAt, hours.hourStart, hours.minuteStart, hours.amPmStart);
                const end = convertTime(sheet.createdAt, hours.hourEnd, hours.minuteEnd, hours.amPmEnd);

                equipmentDef.hours = {
                    start,
                    end,
                };
            }
        });

        await Sheets.update({
            _id: sheet._id
        }, {
            $set: {
                equipment,
            },
        });
    }));

    // equipment
    await Sheets.updateMany({
        equipment: {
            $exists: false,
        },
    }, {
        $set: {
            equipment: [],
        },
    });

    // forceAccount
    await Sheets.updateMany({
        forceAccount: {
            $exists: false,
        },
    }, {
        $set: {
            forceAccount: 'No'
        }
    });

    // grid (regEx: true)
    await Promise.all((await Sheets.find({}).toArray()).map(sheet =>
        Sheets.updateMany({}, {
            'grid.date': moment(sheet.createdAt).format('DD-MM-YYYY'),
            'grid.position': 0,
        })
    ));

    // hours (converting to format)
    await Promise.all((await Sheets.find({
        hours: {
            $exists: true,
        }
    }).toArray()).map(async sheet => {
        let { hours } = sheet;
        hours = hours[0];

        const start = convertTime(sheet.createdAt, hours.hourStart, hours.minuteStart, hours.amPmStart);
        const end = convertTime(sheet.createdAt, hours.hourEnd, hours.minuteEnd, hours.amPmEnd);

        await Sheets.update({
            _id: sheet._id,
        }, {
            $set: {
                hours: {
                    start,
                    end,
                },
            },
        });
    }));

    // in case
    await Promise.all((await Sheets.find({
        hours: {
            $exists: false,
        },
        startTime: {
            $exists: true,
        },
    }).toArray()).map(async sheet => {
        let { startTime } = sheet;

        const start = convertTime(sheet.createdAt, startTime.hourStart, startTime.minuteStart, startTime.amPmStart);
        const end = moment(start).add({ hours: 2 }).toDate();

        await Sheets.update({
            _id: sheet._id,
        }, {
            $set: {
                hours: {
                    start,
                    end,
                },
            },
        });
    }));

    // hours - no default value logic

    // noteComments (noCheck: true)

    // notes
    await Sheets.updateMany({
        notes: null,
    }, {
        $set: {
            notes: '',
        },
    });

    // published
    await Sheets.updateMany({}, {
        $set: {
            published: false,
        },
    });

    // schedulerNotes
    await Sheets.updateMany({
        schedulerNotes: null,
    }, {
        $set: {
            schedulerNotes: '',
        },
    });

    // startTime - no default value logic

    // submittedAt (noCheck: true)

    // submittedBy (noCheck: true)

    // timeOfDay
    await Sheets.updateMany({
        timeOfDay: {
            $exists: false,
        },
    }, {
        $set: {
            timeOfDay: 'Day',
        },
    });

    // travelTime (noCheck: true, regEx: true)

    // unpublishedChanges
    await Sheets.updateMany({}, {
        $set: {
            unpublishedChanges: true,
        },
    });

    // weather
    await Promise.all((await Sheets.find({weather: {$exists: true}}).toArray()).map(async sheet => {
        const { weather } = sheet;

        const degreesMatch = weather.match(/\d\d Degrees/);
        const humidityMatch = weather.match(/\d\d% Humidity/);

        await Sheets.update({
            _id: sheet._id,
        }, {
            weather: {
                humidity: humidityMatch ? humidityMatch[0].slice(0, 2) : null,
                notes: weather || null,
                temperature: [degreesMatch ? degreesMatch[0].slice(0, 2) : null],
            },
        });
    }));

    const makeWorkerHoursObject = async () =>
        Promise.all((await Sheets.find({ $where: 'this.workers.some(worker => (worker.hours && Array.isArray(worker.hours)))' }).toArray())
            .map(async sheet => {
                const workers = sheet.workers.map(worker => {
                    if (worker.hours && worker.hours.length) worker.hours = worker.hours[0];
                    else delete worker.hours;
                    if (worker.hours) {
                        delete worker.hours.id;

                        if (worker.hours.hasOwnProperty('overrideStart')) {
                            worker.overrideStart = worker.hours.overrideStart;
                            delete worker.hours.overrideStart;
                        }
                        if (worker.hours.hasOwnProperty('overrideEnd')) {
                            worker.overrideEnd = worker.hours.overrideEnd;
                            delete worker.hours.overrideEnd;
                        }
                        if (worker.hours.hasOwnProperty('overrideTravelTime') && worker.hasOwnProperty('overrideTravelTimeHours')) {
                            worker.overrideTravelTime = worker.hours.overrideTravelTime;
                            worker.overrideTravelTimeHours = worker.hours.overrideTravelTimeHours;
                            delete worker.hours.overrideTravelTime;
                            delete worker.hours.overrideTravelTimeHours;
                        }
                        if (worker.hours.hasOwnProperty('returnToShop')) {
                            worker.returnToShop = worker.hours.returnToShop;
                            delete worker.hours.returnToShop;
                        }
                    }
                    return worker;
                });
                await Sheets.update(sheet._id, { $set: { workers } });
            }));

    const makeWorkerHoursArray = async () =>
        Promise.all((await Sheets.find({ $where: 'this.workers.some(worker => (worker.hours && !Array.isArray(worker.hours)))' }).toArray())
            .map(async sheet => {
                const workers = sheet.workers.map(worker => {
                    if (worker.hours && !Array.isArray(worker.hours)) {
                        if (!worker.hours.id) worker.hours.id = new Meteor.Collection.ObjectID()._str;
                        worker.hours = [worker.hours];
                    }
                    if (worker.hours && worker.hasOwnProperty('overrideStart')) {
                        worker.hours[0].overrideStart = worker.overrideStart;
                        delete worker.overrideStart;
                    }
                    if (worker.hours && worker.hasOwnProperty('overrideEnd')) {
                        worker.hours[0].overrideEnd = worker.overrideEnd;
                        delete worker.overrideEnd;
                    }
                    if (worker.hours && worker.hasOwnProperty('overrideTravelTime') && worker.hasOwnProperty('overrideTravelTimeHours')) {
                        worker.hours[0].overrideTravelTime = worker.overrideTravelTime;
                        worker.hours[0].overrideTravelTimeHours = worker.overrideTravelTimeHours;
                        delete worker.overrideTravelTime;
                        delete worker.overrideTravelTimeHours;
                    }
                    if (worker.hours && worker.hasOwnProperty('returnToShop')) {
                        worker.hours[0].returnToShop = worker.returnToShop;
                        delete worker.returnToShop;
                    }
                    return worker;
                });
                await Sheets.update(sheet._id, { $set: { workers } });
            }));

    const addHoursId = async () =>
        Promise.all((await Sheets.find({ 'workers.hours.id': { $exists: false } }).toArray()).map(async sheet => {
            const workers = sheet.workers.map(worker => {
                if (!worker.hours) return worker;
                worker.hours = worker.hours.map(hours => {
                    if (!hours.id) hours.id = uuid();
                    return hours;
                });
                return worker;
            });
            await Sheets.update(sheet._id, { $set: { workers } });
        }));

    await makeWorkerHoursObject();
    await makeWorkerHoursArray();
    await addHoursId();
};






//
// export default async db => {
//     const version = 'v2';
//
//     const Sheets = db.collection('sheets');
//     const Projects = db.collection('projects');
//
//     try {
//         // custom
//         await Sheets.updateMany({startTime: { $exists: false }}, {
//             $set: {
//                 startTime: {
//                     hourStart: '6',
//                     minuteStart: '30',
//                     amPmStart: 'am'
//                 }
//             }
//         });
//     } catch(e) {
//         console.log('Err1');
//         return;
//     }
//
//     try {
//         // Add hours: { start, end } for each sheet/worklog
//         (await Sheets.find({ hours: { $exists: false } }).toArray()).forEach(sheet => {
//             const { startTime } = sheet;
//             const startOfDay = moment(sheet.createdAt).startOf('day');
//             const momentStartTime = moment(`${startTime.hourStart}:${startTime.minuteStart} ${startTime.amPmStart}`, 'hh:mm a');
//             const start = moment(startOfDay).add({ hours: momentStartTime.hours(), minutes: momentStartTime.minutes() }).toDate();
//             const end = moment(start).add({ hours: 2 }).toDate();
//             Sheets.update({_id: sheet._id}, { $set: { hours: { start, end } } });
//         });
//     } catch(e) {
//         console.log('Err2');
//         return;
//     }
//
//     try {
//         // Set for notes and scheduleNotes empty string as deafult value, remove nulls
//         (await Sheets.find({ $or: [{ notes: { $exists: true, $not: /.*/ } }, { schedulerNotes: { $exists: true, $not: /.*/ } }] }).toArray()).forEach(sheet => {
//             const newNotes = {};
//             if (typeof sheet.notes !== 'string') {
//                 newNotes.notes = '';
//             }
//             if (typeof sheet.schedulerNotes !== 'string') {
//                 newNotes.schedulerNotes = '';
//             }
//             if (Object.keys(newNotes).length) {
//                 Sheets.update({_id: sheet._id}, { $set: newNotes });
//             }
//         });
//     } catch(e) {
//         console.log('Err3');
//         return;
//     }
//
//     try {
//         const projectIds = (await Projects.find().toArray()).map(proj => proj._id);
//         Sheets.remove({ projectId: { $nin: projectIds } });
//     } catch(e) {
//         console.log('Err4');
//         return;
//     }
//
//     // try {
//     //     (await Sheets.find({
//     //         $or: [
//     //             { submittedAt: { $exists: true } },
//     //             { publishedAt: true }
//     //         ]
//     //     }).toArray()).forEach(async sheet => {
//     //         if (sheet.project && !sheet.project.submissionClone) {
//     //             const updates = {};
//     //             updates.contractorId = await Meteor.callAsync('contractors.submissionClone', sheet.contractorId, sheet._id);
//     //             updates.projectId = await Meteor.callAsync('projects.submissionClone', sheet.projectId, sheet._id, updates.contractorId);
//     //             Sheets.update({_id: sheet._id}, { $set: updates });
//     //         }
//     //     });
//     // } catch(e) {
//     //     console.log('Err5');
//     //     return;
//     // }
//
//     const makeWorkerHoursObject = async () => {
//         (await Sheets.find({ $where: 'this.workers.some(worker => (worker.hours && Array.isArray(worker.hours)))' }).toArray())
//             .forEach(sheet => {
//                 const workers = sheet.workers.map(worker => {
//                     if (worker.hours && worker.hours.length) worker.hours = worker.hours[0];
//                     else delete worker.hours;
//                     if (worker.hours) {
//                         delete worker.hours.id;
//
//                         if (worker.hours.hasOwnProperty('overrideStart')) {
//                             worker.overrideStart = worker.hours.overrideStart;
//                             delete worker.hours.overrideStart;
//                         }
//                         if (worker.hours.hasOwnProperty('overrideEnd')) {
//                             worker.overrideEnd = worker.hours.overrideEnd;
//                             delete worker.hours.overrideEnd;
//                         }
//                         if (worker.hours.hasOwnProperty('overrideTravelTime') && worker.hasOwnProperty('overrideTravelTimeHours')) {
//                             worker.overrideTravelTime = worker.hours.overrideTravelTime;
//                             worker.overrideTravelTimeHours = worker.hours.overrideTravelTimeHours;
//                             delete worker.hours.overrideTravelTime;
//                             delete worker.hours.overrideTravelTimeHours;
//                         }
//                         if (worker.hours.hasOwnProperty('returnToShop')) {
//                             worker.returnToShop = worker.hours.returnToShop;
//                             delete worker.hours.returnToShop;
//                         }
//                     }
//                     return worker;
//                 });
//                 Sheets.update({_id: sheet._id}, { $set: { workers } });
//             });
//     };
//
//     const makeWorkerHoursArray = async () => {
//         (await Sheets.find({ $where: 'this.workers.some(worker => (worker.hours && !Array.isArray(worker.hours)))' }).toArray())
//             .forEach(sheet => {
//                 const workers = sheet.workers.map(worker => {
//                     if (worker.hours && !Array.isArray(worker.hours)) {
//                         if (!worker.hours.id) worker.hours.id = new Meteor.Collection.ObjectID()._str;
//                         worker.hours = [worker.hours];
//                     }
//                     if (worker.hours && worker.hasOwnProperty('overrideStart')) {
//                         worker.hours[0].overrideStart = worker.overrideStart;
//                         delete worker.overrideStart;
//                     }
//                     if (worker.hours && worker.hasOwnProperty('overrideEnd')) {
//                         worker.hours[0].overrideEnd = worker.overrideEnd;
//                         delete worker.overrideEnd;
//                     }
//                     if (worker.hours && worker.hasOwnProperty('overrideTravelTime') && worker.hasOwnProperty('overrideTravelTimeHours')) {
//                         worker.hours[0].overrideTravelTime = worker.overrideTravelTime;
//                         worker.hours[0].overrideTravelTimeHours = worker.overrideTravelTimeHours;
//                         delete worker.overrideTravelTime;
//                         delete worker.overrideTravelTimeHours;
//                     }
//                     if (worker.hours && worker.hasOwnProperty('returnToShop')) {
//                         worker.hours[0].returnToShop = worker.returnToShop;
//                         delete worker.returnToShop;
//                     }
//                     return worker;
//                 });
//                 Sheets.update({_id: sheet._id}, { $set: { workers } });
//             });
//     };
//
//     const addHoursId = async () => {
//         (await Sheets.find({ 'workers.hours.id': { $exists: false } }).toArray()).forEach(sheet => {
//             const workers = sheet.workers.map(worker => {
//                 if (!worker.hours) return worker;
//                 worker.hours = worker.hours.map(hours => {
//                     if (!hours.id) hours.id = new Meteor.Collection.ObjectID()._str;
//                     return hours;
//                 });
//                 return worker;
//             });
//             Sheets.update({_id: sheet._id}, { $set: { workers } });
//         });
//     };
//
//     switch(version) {
//         case 'v1': {
//             await makeWorkerHoursObject();
//             break;
//         }
//         case 'v2': {
//             try {
//                 await makeWorkerHoursArray();
//                 await addHoursId();
//             } catch(e) {
//                 console.log('Err6');
//                 return;
//             }
//         }
//     }
// }