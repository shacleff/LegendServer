import {Application, FrontendSession} from 'pinus';

export default function (app: Application) {
    return new Handler(app);
}

export class Handler {
    constructor(private app: Application) {

    }

    async entry(msg: { username: string }, session: FrontendSession) {
        let self = this;

        // 当前所在的游戏场景,都在一个场景里
        let rid = "MainScene";
        let uid = msg.username;
        let sessionService = self.app.get('sessionService');

        // 检查uid是否重复登录
        if (!!sessionService.getByUid(uid)) {
            return {
                code: 500,
                error: true
            };
        }

        // 为新来的session绑定uid
        await session.abind(uid);

        // 绑定房间号
        session.set('rid', rid);

        // 把房间号推送到其它服务器
        session.push('rid', function (err) {
            if (err) {
                console.error('set rid for session service failed! error is : %j', err.stack);
            }
        });

        // 玩家断线后的回调
        session.on('closed', this.onUserLeave.bind(this));

        // 加入场景服务器
        let user_info = await self.app.rpc.scene.sceneRemote.add.route(session)(uid, self.app.get('serverId'), rid, true);

        return user_info;
    }

    // 玩家断线处理
    onUserLeave(session: FrontendSession) {
        if (!session || !session.uid) {
            return;
        }

        // 场景服务器把玩家踢掉
        this.app.rpc.scene.sceneRemote.kick.route(session, true)(session.uid, this.app.get('serverId'), session.get('rid'));
    }
}
