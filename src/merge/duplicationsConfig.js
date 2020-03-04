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
    'settings': [
        '_id',
    ],
    'sheets': [
        '_id',
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