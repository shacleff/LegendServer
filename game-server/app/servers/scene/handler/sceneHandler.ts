import {SceneRemote} from '../remote/sceneRemote';
import {Application, BackendSession} from 'pinus';
import {FrontendSession} from 'pinus';
import {Point} from '../base/Point';
import {MainScene} from '../drive/MainScene';
import {sleep} from '../../../util/tool';
import {get_map_width, get_map_height} from '../../../util/mapData';

export default function (app: Application) {
    return new SceneHandler(app);
}

export class SceneHandler {
    constructor(private app: Application) {
    }

    // 给玩家发送信息
    async send_msg(msg: { content: string, target: string }, session: BackendSession) {
        let rid = session.get('rid');
        let username = session.uid;
        let channelService = this.app.get('channelService');
        let param = {
            msg: msg.content,
            from: username,
            target: msg.target
        };
        let channel = channelService.getChannel(rid, false);

        // 目标是所有人
        if (msg.target === '*') {
            channel.pushMessage('onChat', param);
        } else { // 目标是指定的人
            let tuid = msg.target;
            let tsid = channel.getMember(tuid)['sid'];
            channelService.pushMessageByUids('onChat', param, [{
                uid: tuid,
                sid: tsid
            }]);
        }
    }

    // 玩家移动操作
    async move_to(body: { pot: Point, target: string }, session: BackendSession) {
        if (session.uid != body.target) {
            return {error: "你只能移动自己！"};
        } else {
            let msg = {handler: 'handler_move_to', body: body};
            MainScene.getInstance().push_message(msg);
            return {ok: 200};
        }
    }

    // 玩家攻击操作
    async attack(body: { target: string }, session: BackendSession) {
        body['active'] = session.uid; //设置主动对象
        if (body.target == session.uid) {
            return {error: "不能攻击自己！"};
        } else {
            let msg = {handler: 'handler_attack', body: body};
            MainScene.getInstance().push_message(msg);
            return {ok: 200};
        }
    }

    // 使用物品
    async use_res(body: { res_index: number }, session: BackendSession) {
        body['active'] = session.uid; //设置主动对象
        if (body.res_index < 0 || body.res_index >= 18) {
            return {error: "物品下标超出范围！"};
        } else {
            let msg = {handler: 'handler_use_res', body: body};
            MainScene.getInstance().push_message(msg);
            return {ok: 200};
        }
    }

    // 使用技能
    async uuse_res(body: { res_index: number, target: string, pot: Point }, session: BackendSession) {
        body['active'] = session.uid; //设置主动对象
        if (body.res_index < 0 || body.res_index >= 18) {
            return {error: "物品下标超出范围！"};
        } else {
            let msg = {handler: 'handler_uuse_res', body: body};
            MainScene.getInstance().push_message(msg);
            return {ok: 200};
        }
    }

    // 交换物品位置
    async exchange_res(body: { o_index: number, e_index: number }, session: BackendSession) {
        body['active'] = session.uid; //设置主动对象
        if (body.o_index < 0 || body.o_index >= 18 || body.e_index < 0 || body.e_index >= 18) {
            return {error: "物品下标超出范围！"};
        } else {
            let msg = {handler: 'handler_exchange_res', body: body};
            MainScene.getInstance().push_message(msg);
            return {ok: 200};
        }
    }

    // 获得背包数据
    async get_bag(body: any, session: BackendSession) {
        return MainScene.getInstance().get_player_bag(session.uid);
    }

    // 获得角色数据
    async get_info(body: any, session: BackendSession) {
        return MainScene.getInstance().get_player_info(session.uid);
    }

    // 拾取物品
    async pickup(body: { pot: Point }, session: BackendSession) {
        //设置主动对象
        body['active'] = session.uid;
        if (body.pot.x < 0 || body.pot.x >= get_map_width() ||
            body.pot.y < 0 || body.pot.y >= get_map_height()) {
            return {error: "拾取位置超出范围！"};
        } else {
            let msg = {handler: 'handler_pickup', body: body};
            MainScene.getInstance().push_message(msg);
            return {ok: 200};
        }
    }

    // 丢弃物品
    async discard(body: { index: number }, session: BackendSession) {
        body['active'] = session.uid; //设置主动对象
        let msg = {handler: 'handler_discard', body: body};
        MainScene.getInstance().push_message(msg);
        return {ok: 200};
    }
}
