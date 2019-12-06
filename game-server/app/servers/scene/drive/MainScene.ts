import {Target} from "../base/Target";
import {Actor} from "../base/Actor";
import {ChannelService, Channel} from "pinus";
import {PActor} from "../base/PActor";
import {PRes} from "../base/PRes";
import {Player} from "../base/Player";
import {Point} from "../base/Point";
import {Move} from "../Effect/Move";
import {Attack} from "../Effect/Attack";
import {Res} from "../Res/Res";
import {SkillBook, SkillBookConfig} from "../Res/SkillBook";
import {ResConfig} from "../../../util/resConfig";
import {get_l} from "../../../util/tool";
import A_star_pathfinder from "../../../util/pathFinding";
import {EffectConfig} from "../base/Effect";
import {get_map, get_map_width, get_map_height} from "../../../util/mapData";
import {Monster} from "../base/Monster";
import {MonsterActiveAI} from "../Effect/MonsterActiveAI";

// 项
export interface PTerm {
    player: PActor;
    res: PRes;
}

// 消息
interface Message {
    handler: string; // 消息处理函数名
    body: any;       // 消息体
}

// 场景驱动
export class MainScene extends Target {
    // 场景单例
    private static _instance: MainScene = null;

    public static getInstance(): MainScene {
        if (!this._instance) this._instance = new MainScene();
        return this._instance;
    }

    public name: string = null;
    private _message_stack: Message[] = [];
    private _actors_dic: {} = {};
    private _actors: Actor[] = [];
    public grid_map: number[][] = [];
    public term_map: PTerm[][] = [];
    public pathFind: A_star_pathfinder;
    private _tick_timer: NodeJS.Timer = null;
    private _tick_index: number = 0; // 滴答计数
    private _channelService: ChannelService;
    private _channel: Channel;

    constructor() {
        super();
        this.name = "绝地求生";
        this._tick_timer = setInterval(this.tick.bind(this), 1000 / 60); // 游戏世界刷新时间为1/60秒每帧
        let map_data: number[][] = get_map();
        for (let i = 0; i < map_data[0].length; i++) {
            this.grid_map[i] = [];
            this.term_map[i] = [];
            for (let j = 0; j < map_data.length; j++) {
                map_data[j][i] = map_data[j][i] == 1 ? 0 : 1;
                this.grid_map[i][j] = map_data[j][i];
                this.term_map[i][j] = {player: null, res: null};
            }
        }
        let pathFind = new A_star_pathfinder();
        this.pathFind = pathFind;
        // this.pathFind.init(this.grid_map);
        this.pathFind.init(map_data);
    }

    public push_message(msg: Message): void {
        this._message_stack.push(msg);
    }

    private tick(): void {
        this._tick_index++;
        this.handler_message();
        this.execute_effect();
        this.manager_res();
        this.manager_monster();
    }

    // 处理客户端消息（每帧处理）
    private handler_message(): void {
        while (this._message_stack.length > 0) {
            let msg: Message = this._message_stack.shift();
            if (this[msg.handler]) {
                this[msg.handler](msg.body);
            } else {
                console.error("MainScene not has " + msg.handler + " function!");
            }
        }
    }

    // 管理地图资源，生成和销毁吃鸡装备
    private manager_res(): void {
        if (this._tick_index % 60 * 3 != 0) return;
        let {sum, res_list} = this.total_res_sum();
        let rnd = 50 - Math.ceil(Math.random() * sum);
        rnd = Math.ceil(Math.random() * rnd);
        rnd = Math.ceil(Math.random() * rnd);
        if (sum < 50 && rnd > 10 && Math.random() > 0.8) {
            let res: Res = ResConfig.get_random_res();
            let x: number = Math.floor(Math.random() * get_map_width());
            let y: number = Math.floor(Math.random() * get_map_height());
            let pot: Point = {x: x, y: y};
            res.res_move_to(pot, this.term_map);
            this.notice_all_player('onCreateRes', {name: res.name, point: pot, index: res.index});
        } else if (sum > 150) {
            let rnd_idx: number = Math.floor(Math.random() * res_list.length);
            let rnd_res: Res = res_list[rnd_idx];
            rnd_res.res_out(this.term_map);
            this.notice_all_player('onDeleteRes', {name: rnd_res.name, point: rnd_res.point, index: rnd_res.index});
        }
    }

    // 统计地图物品的数量
    private total_res_sum(): { sum: number, res_list: Res[] } {
        let sum: number = 0;
        let res_list: Res[] = [];
        for (let i = 0; i < get_map_width(); i++) {
            for (let j = 0; j < get_map_height(); j++) {
                let term: PTerm = this.term_map[i][j];
                let pres: PRes = term.res;
                while (pres) {
                    sum++;
                    res_list.push(pres.res);
                    pres = pres.next;
                }
            }
        }
        return {sum, res_list};
    }

    // 管理地图资源，生成和销毁野怪
    private manager_monster(): void {
        if (this._tick_index % 60 * 30 != 0) return;
        let sum: number = this.total_monster_sum();
        let rnd = 60 - Math.ceil(Math.random() * sum);
        rnd = Math.ceil(Math.random() * rnd);
        rnd = Math.ceil(Math.random() * rnd);
        if (sum < 60 && rnd > 10 && Math.random() > 0.8) {
            let monster: Monster = new Monster(ResConfig.get_random_monster(), this);
            let ai: MonsterActiveAI = new MonsterActiveAI(monster);
            monster.pushEffect(ai);
            this.add_actor(monster);
            this.notice_all_player("onCreate", monster.get_info());
        }
    }

    // 统计地图上的怪物数量
    private total_monster_sum(): number {
        let sum = 0;
        // 所有角色的效果
        this._actors.forEach(element => {
            if (element.get_config_name() != '人') sum++;
        });
        return sum;
    }

    // 执行游戏世界中的各种效果
    private execute_effect(): void {
        // 所有角色的效果
        this._actors.forEach(element => {
            element.run();
        });
        this.run();///全局效果
    }

    // 进入游戏世界
    public enter_game(user_name: string): {} {
        let player: Player = new Player(user_name, get_map_width(), get_map_height(), this);
        this.add_actor(player);
        let self = this;

        function get_other_players() {
            let players = [];
            self._actors.forEach(element => {
                if (element.name != user_name) players.push(element.get_info());
            });
            return players;
        }

        function get_all_ress() {
            let ress = [];
            for (let i = 0; i < get_map_width(); i++) {
                for (let j = 0; j < get_map_height(); j++) {
                    let term: PTerm = self.term_map[i][j];
                    let pres: PRes = term.res;
                    while (pres) {
                        ress.push({name: pres.res.name, point: {x: i, y: j}, index: pres.res.index});
                        pres = pres.next;
                    }
                }
            }
            return ress;
        }

        this.notice_all_player("onCreate", player.get_info());
        return {player: player.get_info(), other_players: get_other_players(), ress: get_all_ress()};
    }

    // 获得玩家背包数据
    public get_player_bag(user_name: string): any[] {
        let player: Player = this._actors_dic[user_name];
        if (player) {
            return player.get_bag();
        }
    }

    // 获得角色信息
    public get_player_info(user_name: string): any {
        let player: Player = this._actors_dic[user_name];
        if (player) {
            return player.get_info();
        }
    }

    // 离开游戏世界
    public leave_game(user_name: string): void {
        let player: Player = this._actors_dic[user_name];
        if (player) {
            this.remove_actor(player);
            this.notice_all_player("onDelete", player.get_info());
        }
    }

    // 移除角色
    public remove_actor(actor: Actor): void {
        let player: Actor = this._actors_dic[actor.name];
        if (player) {
            player.out();//离开地图
            let index: number = this._actors.indexOf(player);
            this._actors.splice(index, 1);
            this._actors_dic[actor.name] = null;
        }
    }

    // 添加actor
    public add_actor(actor: Actor): void {
        this._actors.push(actor);
        this._actors_dic[actor.name] = actor;
    }

    public set_channel(channelService: ChannelService, channel: Channel): void {
        this._channelService = channelService;
        this._channel = channel;
    }

    // 向某个玩家通知消息
    public notice_one_player(onType: string, body: Object, tuid: string): void {
        let tsid = this._channel.getMember(tuid)['sid'];
        this._channelService.pushMessageByUids(onType, body, [{
            uid: tuid,
            sid: tsid
        }]);
    }

    // 向地图的所有玩家推送消息
    public notice_all_player(onType: string, body: Object): void {
        this._channel.pushMessage(onType, body);
    }

    public getTarget(): Actor[] {
        return this._actors;
    }

    // 程序退出，清理场景
    public Destructor(): void {
        this._tick_timer.unref();
        clearInterval(this._tick_timer);
        this._channel = null;
        this._channelService = null;
        MainScene._instance = null;
    }

    ////////----------------message 处理函数-----------------------------

    private handler_move_to(body: { pot: Point, target: string }): void {
        let player: Player = this._actors_dic[body.target];
        let w = get_map_width(), h = get_map_height();
        if (body.pot.x < 0 || body.pot.x >= w || body.pot.y < 0 || body.pot.y >= h) return;
        if (player && !player.is_die) {
            player.killEffectByName('Move');
            let is_over: boolean = true;
            let term: PTerm = this.term_map[body.pot.x][body.pot.y];
            if (term.player != null) is_over = false;
            let move: Move = new Move(body.pot, this.pathFind, player, is_over);
            player.pushEffect(move);
        }
    }

    private handler_attack(body: { target: string, active: string }): void {
        let target: Actor = this._actors_dic[body.target];
        let active: Actor = this._actors_dic[body.active];
        if (target && active && !target.is_die && !active.is_die) {
            let attack: Attack = new Attack(active, target);
            active.pushEffect(attack);
            let player: Player = <Player>active;
            player.set_pet_target(target);
        }
    }

    private handler_use_res(body: { res_index: number, active: string }): void {
        let active: Player = this._actors_dic[body.active];
        if (active && !active.is_die) {
            let res: Res = active.get_res_by_index(body.res_index);
            if (res) res.use(active);
        }
    }

    // 使用技能
    private handler_uuse_res(body: { res_index: number, target: string, pot: Point, active: string }): void {
        let active: Player = this._actors_dic[body.active];
        let target: Actor = this._actors_dic[body.target];
        if (active && !active.is_die) {
            let res: Res = active.get_res_by_index(body.res_index);
            if (!res) return;
            if (res.type != 'skill_book') return;
            let book: SkillBook = <SkillBook>res;
            let skill_config: SkillBookConfig = <SkillBookConfig>book.get_config();
            let effect_name: string = skill_config.effect_name;
            if (effect_name == "RagingFire" || effect_name == "SkyFire" || effect_name == "Hemophagy") {//单体技能
                if (!target || target.is_die) return;
                book.uuse(active, target, body.pot);

                let player: Player = active;
                player.set_pet_target(target);
            } else {// 全体技能
                book.uuse(active, this, body.pot);
            }
        }
    }

    // 拾取物品
    private handler_pickup(body: { pot: Point, active: string }): void {
        let active: Player = this._actors_dic[body.active];
        let l: number = get_l(active.point, body.pot);
        if (active && !active.is_die && l < 5) {
            if (!active.is_package_gap()) return;
            let term: PTerm = this.term_map[body.pot.x][body.pot.y];
            if (!term) return;
            if (!term.res) return;
            let index: number = active.get_package_gap();
            let pres: PRes = term.res;
            if (pres.next) pres.next.prev = null;
            term.res = term.res.next;
            active.dis_package_index(index, pres.res);
            this.notice_all_player('onDeleteRes', {name: pres.res.name, point: body.pot, index: pres.res.index});
        }
    }

    // 交换物品
    private handler_exchange_res(body: { o_index: number, e_index: number, active: string }): void {
        let active: Player = this._actors_dic[body.active];
        if (active && !active.is_die) {
            let o_res = active.out_package_index(body.o_index);
            let e_res = active.out_package_index(body.e_index);
            if (o_res) {
                active.dis_package_index(body.e_index, o_res);
            }
            if (e_res) {
                active.dis_package_index(body.o_index, e_res);
            }
        }
    }

    private handler_discard(body: { index: number, active: string }): void {
        let active: Player = this._actors_dic[body.active];
        if (active && !active.is_die) {
            let res: Res = active.out_package_index(body.index);
            if (res) {
                let pot: Point = active.point;
                // this.res_move_to(pot,res);
                res.res_move_to(pot, this.term_map);
                this.notice_all_player('onCreateRes', {name: res.name, point: pot, index: res.index});
            }
        }
    }
}
