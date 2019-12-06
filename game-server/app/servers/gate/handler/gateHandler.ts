import {dispatch} from '../../../util/dispatcher';
import {Application, BackendSession} from 'pinus';

export default function (app: Application) {
    return new GateHandler(app);
}

export class GateHandler {
    constructor(private app: Application) {
    }

    // 负责负载均衡,分配一个connector服务器
    async queryEntry(msg: { uid: string }, session: BackendSession) {
        let uid = msg.uid; // uid的名字

        if (!uid) {
            return {
                code: 500
            };
        }

        // get all connectors
        let connectors = this.app.getServersByType('connector');
        if (!connectors || connectors.length === 0) {
            return {
                code: 500
            };
        }

        // select connector
        let res = dispatch(uid, connectors);
        return {
            code: 200,
            host: res.clientHost,
            port: res.clientPort
        };
    }
}
