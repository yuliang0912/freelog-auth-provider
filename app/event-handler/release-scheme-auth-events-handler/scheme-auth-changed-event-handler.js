'use strict'

const lodash = require('lodash')
const semver = require('semver')
const {ReleaseSchemeAuthResultResetEvent} = require('../../enum/rabbit-mq-publish-event')

module.exports = class ReleaseSchemeAuthChangedEventHandler {

    constructor(app) {
        this.app = app
        this.releaseAuthResultProvider = app.dal.releaseAuthResultProvider
        this.releaseSchemeAuthRelationProvider = app.dal.releaseSchemeAuthRelationProvider
        this.presentableLockedDependencyProvider = app.dal.presentableLockedDependencyProvider
    }

    /**
     * 发行的某个版本授权结果发行变更事件处理
     */
    async handler({schemeId}) {

        const releaseAuthResult = await this.releaseAuthResultProvider.findOne({schemeId})

        const {releaseId, version} = releaseAuthResult
        const task1 = this.noticeDownstreamReleaseScheme(releaseId, schemeId, version)
        const task2 = this.noticeDownstreamPresentable(releaseId, schemeId, version)

        await Promise.all([task1, task2])
    }

    /**
     * 通知下游使用此版本发行的其他发行
     * @param releaseId
     * @param schemeId
     * @param version
     * @returns {Promise<void>}
     */
    async noticeDownstreamReleaseScheme(releaseId, schemeId, version) {

        const {app} = this
        const {resourceVersions} = await app.curlIntranetApi(`${app.webApi.releaseInfo}/${releaseId}`)
        const releaseVersions = resourceVersions.map(x => x.version)


        //获取所有依赖此发行的方案集合.然后通过semver规则对比.过滤掉不符合的版本
        const allAssociatedReleaseSchemes = await this.releaseSchemeAuthRelationProvider.find({resolveReleaseId: releaseId})
        const needCalculateAuthReleaseSchemeIds = lodash.chain(allAssociatedReleaseSchemes).flatten().filter(item => {
            return item.resolveReleaseVersionRanges.some(versionRange => semver.maxSatisfying(releaseVersions, versionRange) === version)
        }).map(x => x.schemeId).uniq().value()

        const tasks = needCalculateAuthReleaseSchemeIds.map(schemeId => app.rabbitClient.publish(Object.assign({}, ReleaseSchemeAuthResultResetEvent, {
            body: {schemeId, operation: 2}
        })))

        await Promise.all(tasks)
    }

    /**
     * 通知使用并解决此版本发行的presentable
     * @returns {Promise<void>}
     */
    async noticeDownstreamPresentable(releaseId, schemeId, version) {

        const allAssociatedPresentables = await this.presentableLockedDependencyProvider.find({
            dependReleaseId: releaseId, lockedReleaseVersions: version
        })

        const tasks = allAssociatedPresentables.map(presentableId => this.app.rabbitClient.publish(Object.assign({}, ReleaseSchemeAuthResultResetEvent, {
            body: {presentableId, operation: 2}
        })))

        await Promise.all(tasks)
    }
}