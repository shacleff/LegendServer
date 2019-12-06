import {Effect} from "../base/Effect";
import {Point} from "../base/Point";
import {Target} from "../base/Target";
import {Actor} from "../base/Actor";
import A_star_pathfinder from "../../../util/pathFinding";

// Move 移动效果
export class Move implements Effect {

    private _to: Point = null;
    private _active: Target = null;
    private _pathFind: A_star_pathfinder;
    private _player: Actor = null;
    private _o: Point = null;
    private _is_run: Boolean = false;
    private _path: Point[];
    private _tick: number = 0;
    private _speed: number;
    private _ppath: number = 0;
    private _is_end: boolean;
    private _is_over: boolean;   // 是否走到终点，否则走到终点的前一点

    constructor(to: Point, pathFind: A_star_pathfinder, active: Target, is_over: boolean = true) {
        this._to = to;
        this._active = active;
        this._player = active.getTarget()[0];
        this._o = this._player.point;
        this._is_over = is_over;
        this._pathFind = pathFind;
        this._is_end = false;
    }

    // 效果名字
    getName(): string {
        return 'Move';
    }

    // 效果的施放者
    getActive(): Target {
        return this._active;
    }

    // 效果的目标对象
    getTarget(): Target {
        return this._active;
    }

    // 运行效果
    run(): void {
        if (this._is_end) return;
        if (!this.is_run()) {
            this._is_run = true;
            let self = this;
            let path = self._pathFind.findPath(self._o.x, self._o.y, self._to.x, self._to.y);
            self._path = path;
            let speed = this._player.getTickSpeed();
            this._speed = speed;
            this._tick = this._player.pass_tick;
            let o_tick: number = this._tick >= this._speed ? 1 : this._speed - this._tick;
            this._player.notice_all_player("onMove", {
                path: path,
                speed: speed,
                target: this._player.name,
                over: this._is_over,
                o_pot: this._o,
                o_tick: o_tick
            });
        } else {
            this._tick++;
            if (this._tick >= this._speed) {
                this._tick = 0;
                if (!this._path
                    || (this._is_over && this._ppath >= this._path.length)
                    || (!this._is_over && this._ppath >= this._path.length - 1)) {
                    this._is_end = true;
                    this._is_run = false;
                    this._player.pass_tick = this._tick;
                    return
                } else {
                    let pot: Point = this._path[this._ppath];
                    this._player.move_to(pot);
                }
                this._ppath++;
            }
            this._player.pass_tick = this._tick;
        }
    }

    // 效果是否运行中
    is_run(): Boolean {
        return this._is_run;
    }

    // 强制kill运行中的效果
    kill(): void {
        this._is_end = true;
        this._is_run = false;
        this._pathFind = null;
    }
}
