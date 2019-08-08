'use strict'

const lodash = require('lodash')
const {PresentableAuthResultResetEvent} = require('../../enum/rabbit-mq-publish-event')

module.exports = class PresentableLockedVersionChangedEventHandler {

    constructor(app) {
        this.app = app
        this.presentableAuthResultProvider = app.dal.presentableAuthResultProvider
        this.presentableBindContractProvider = app.dal.presentableBindContractProvider
        this.presentableLockedDependencyProvider = app.dal.presentableLockedDependencyProvider
    }

    /**
     * presentable切换版本事件
     * @param presentableAuthTreeInfo
     */
    async handler(presentableAuthTreeInfo) {

        const {presentableId, version, authTree} = presentableAuthTreeInfo

        const presentableLockedDependencies = this._presentableAuthTreeGroupByReleaseId(authTree).map((releaseId, versions) => Object({
            presentableId,
            dependReleaseId: releaseId, status: 0,
            lockedReleaseVersions: versions.map(version => Object({
                version, updateDate, authStatus: 0
            }))
        }))

        await this.presentableLockedDependencyProvider.deleteMany({presentableId})
        await this.presentableLockedDependencyProvider.insertMany(presentableLockedDependencies)

        this.presentableAuthResultProvider.updateOne({presentableId}, {version})
        this.app.rabbitClient.publish(Object.assign({}, PresentableAuthResultResetEvent, {
            body: {presentableId, operation: 2} //发送指令,要求计算当前方案的授权状态
        }))
    }

    /**
     * 根据发行ID获取分组版本
     * @param authTree
     * @returns {*}
     * @private
     */
    _presentableAuthTreeGroupByReleaseId(authTree) {

        return lodash.chain(authTree).groupBy('releaseId').entries().map((releaseId, values) => Object({
            releaseId, versions: lodash.chain(values).map(x => x.version).uniq().value
        })).value()
    }
}