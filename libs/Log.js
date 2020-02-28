import fs from 'fs';

export class Log {
    constructor(filePath, overrideOnInit) {
        this.overrideOnInit = overrideOnInit;
        this.filePath = filePath;

        this._init();
    }

    _init() {
        this.overrideOnInit && fs.existsSync(this.filePath) && fs.unlinkSync(this.filePath);
    }

    log(data) {
        console.log(data);
        fs.appendFile(this.filePath, data);
    }
}