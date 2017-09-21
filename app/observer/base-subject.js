/**
 * Created by yuliang on 2017/9/20.
 */

'use strict'

const baseObserver = require('./base-observer')

module.exports = class Subject {

    constructor() {
        this.observers = []
    }

    /**
     * 注册观察者
     */
    registerObserver(observer) {
        if (observer instanceof baseObserver) {
            this.observers.push(observer);
        }
        else {
            console.error('Error: observer must be extends base-observer')
        }
    }

    /**
     * 移除观察者
     */
    removeObserver(observer) {
        let index = this.observers.indexOf(observer)
        index > -1 && this.observers.splice(index, 1)
    }

    /**
     * 通知观察者
     */
    notifyObservers() {
        throw new Error("This method must be overwritten!");
    }
}