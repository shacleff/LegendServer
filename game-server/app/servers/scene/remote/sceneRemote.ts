import {Application, ChannelService, RemoterClass, FrontendSession} from 'pinus';
import {MainScene} from '../drive/MainScene';


export default function (app: Application) {
    return new SceneRemote(app);
}

// UserRpc的命名空间自动合并
declare global {
    interface UserRpc {
        scene: {
            sceneRemote: RemoterClass<FrontendSession, SceneRemote>;
        };
    }
}

export class SceneRemote {

    constructor(private app: Application) {
        this.app = app;
        this.channelService = app.get('channelService');
        let channel = this.channelService.getChannel('MainScene', true);
        MainScene.getInstance().set_channel(this.channelService, channel);
    }

    private channelService: ChannelService;

    /**
     * Add user into chat channel.
     *
     * @param {String} uid unique id for user
     * @param {String} sid server id
     * @param {String} name channel name
     * @param {boolean} flag channel parameter
     *
     */
    public async add(uid: string, sid: string, name: string, flag: boolean) {
        let channel = this.channelService.getChannel(name, flag);
        let username = uid;
        let param = {
            user: username
        };
        channel.pushMessage('onAdd', param);

        if (!!channel) {
            channel.add(uid, sid);
        }

        let game_info = MainScene.getInstance().enter_game(username);
        return game_info;
    }

    /**
     * Get user from chat channel.
     *
     * @param {Object} opts parameters for request
     * @param {String} name channel name
     * @param {boolean} flag channel parameter
     * @return {Array} users uids in channel
     *
     */
    private get(name: string, flag: boolean) {
        let users: string[] = [];
        let channel = this.channelService.getChannel(name, flag);
        if (!!channel) {
            users = channel.getMembers();
        }
        return users;
    }

    /**
     * Kick user out chat channel.
     *
     * @param {String} uid unique id for user
     * @param {String} sid server id
     * @param {String} name channel name
     *
     */
    public async kick(uid: string, sid: string, name: string) {
        let channel = this.channelService.getChannel(name, false);
        // leave channel
        if (!!channel) {
            channel.leave(uid, sid);
        }
        let username = uid;
        let param = {
            user: username
        };
        MainScene.getInstance().leave_game(username);
        channel.pushMessage('onLeave', param);
    }
}
