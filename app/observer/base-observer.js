/**
 * Created by yuliang on 2017/9/20.
 */

'use strict'

module.exports = class Observer {
    /**
     * 通知观察者
     */
    update() {
        throw new Error("This method must be overwritten!");
    }
}