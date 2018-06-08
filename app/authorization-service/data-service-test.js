/**
 * 后期性能优化的大体思路
 * 以后如果分组的情况比较常见,则批量做身份认证时,先收集请求.然后等待主服务发出开始获取数据事件
 * 统一一次获取.
 * @type {"events".internal}
 */

const event = require('events')

module.exports = class AuthDataSservice extends event {

    constructor() {
        super()
        this.userIds = new Set()
    }

    getUserInfo(userId) {
        this.userIds.set(userId)
        return new Promise((resolve, reject) => {
            this.once('start', () => {
                //getUserInfolist  then resolve this userId info
            })
        })
    }

    memberExistGroup() {

    }
}