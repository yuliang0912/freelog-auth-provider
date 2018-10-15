'use strict'

module.exports = Object.freeze({

    /**
     * 未初始化
     */
    uninitialized: 1,

    /**
     * 暂停状态(执行中,但是未激活)
     */
    suspended: 2,

    /**
     * 系统锁住状态
     */
    locked: 3,

    /**
     * 激活态
     */
    active: 4,

    /**
     * 终止态
     */
    terminate: 6
})