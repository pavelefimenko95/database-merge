import { execSync } from'child_process';
import config from '../config';

execSync(`mongorestore -d ${config.SOURCE_DB} ${config.SOURCE_DB_DUMP} --drop`);
execSync(`mongorestore -d ${config.TARGET_DB} ${config.TARGET_DB_DUMP} --drop`);
console.log('RESTORATION COMPLETED');
