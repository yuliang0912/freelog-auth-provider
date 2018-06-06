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