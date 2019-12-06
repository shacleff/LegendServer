import {Effect, EffectConfig} from "../base/Effect";
import {Actor} from "../base/Actor";
import {Target} from "../base/Target";
import {get_l} from "../../../util/tool";

// 灭天火
export class SkyFire implements Effect {
    private _config: EffectConfig = null;
    private _active: Actor = null;
    private _target: Actor = null;

    constructor(config: EffectConfig, active: Actor, target: Actor) {
        this._config = config;
        this._active = active;
        this._target = target;
    }

    getName(): string {
        return 'SkyFire';
    }

    getActive(): Target {
        return this._active;
    }

    getTarget(): Target {
        return this._target;
    }

    run(): void {
        if (get_l(this._active.point, this._target.point) > this._config.attack_l) return;///攻击有效范围
        this._active.killEffectByName('Move');
        this._active.notice_all_player('onSkyFire',
            {
                active: this._active.name,
                target: this._target.name
            });
        let active: Actor = this._active;
        let target: Actor = this._target;
        let magic_attack: number = active.magic_attack;
        let magic_defense: number = target.magic_defense;
        let hurt: number = SkyFire.getHurt(magic_attack, magic_defense);
        target.blood -= hurt;
    }

    public static getHurt(magic_attack: number, magic_defense: number): number {
        let hurt: number = 3 * magic_attack - magic_defense;
        hurt = hurt <= 0 ? 1 : hurt;
        hurt = Math.ceil(Math.random() * hurt);
        hurt = Math.ceil(Math.random() * hurt);
        hurt = Math.ceil(Math.random() * hurt);
        return hurt;
    }

    is_run(): Boolean {
        return false;
    }

    kill(): void {
        return;
    }
}
