import path from 'path';
import { Log } from '../../../libs/Log';

export default new Log(path.resolve(__dirname, '../../../logs/migrationLogs.txt'), true);