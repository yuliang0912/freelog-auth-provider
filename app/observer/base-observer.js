/**
 * Created by yuliang on 2017/9/20.
 */

'use strict'

const baseSubject = require('./base-subject')

module.exports = class Observer {

    constructor(subject) {
        if (subject instanceof baseSubject) {
            this.subject = subject
            this.subject.registerObserver(this)
        } else {
            console.error('subject must extents baseSubject')
        }
    }

    /**
     * 通知观察者
     */
    update() {
        throw new Error("This method must be overwritten!");
    }
}