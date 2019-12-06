import * as crc from 'crc';
import {ServerInfo} from 'pinus';

// 负载均衡
export function dispatch(uid: string, connectors: ServerInfo[]) {
    let index = Math.abs(crc.crc32(uid)) % connectors.length;
    return connectors[index];
}
