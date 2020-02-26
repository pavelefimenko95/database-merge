import moment from 'moment';
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


export default async db => {
    const Sheets = db.collection('sheets');

    // duplicateNumber (noCheck: true)

    // equipment.XX.hours (regEx: true)
    (await Sheets.find({'equipment': {$exists: true}}).toArray()).forEach(sheet => {
        let { hours } = sheet.equipment;
        if (hours) {
            hours = hours instanceof Array ? hours : [hours];
            hours.forEach(hoursDef => {
                const startOfDay = moment(sheet.createdAt).startOf('day');
                const momentStartTime = moment(`${hoursDef.hourStart}:${hoursDef.minuteStart} ${hoursDef.amPmStart}`, 'hh:mm a');
                const start = moment(startOfDay).add({ hours: momentStartTime.hours(), minutes: momentStartTime.minutes() }).toDate();

                const momentEndTime = moment(`${hoursDef.hourEnd}:${hoursDef.minuteEnd} ${hoursDef.amPmEnd}`, 'hh:mm a');
                const end = moment(startOfDay).add({ hours: momentEndTime.hours(), minutes: momentEndTime.minutes() }).toDate();
                Sheets.update({_id: sheet._id}, {
                    $set: {
                        'equipment.hours': {
                            start,
                            end,
                        },
                    },
                });
            });
        }
    });

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

    // grid
};