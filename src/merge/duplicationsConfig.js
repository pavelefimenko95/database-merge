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
    'sheets': [
        '_id',
        [
            'contractorId',
            'projectId',
            'hours.start',
            'hours.end',
        ],
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