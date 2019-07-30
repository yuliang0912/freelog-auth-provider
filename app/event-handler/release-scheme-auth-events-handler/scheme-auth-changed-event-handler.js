'use strict'

const lodash = require('lodash')
const semver = require('semver')
const {ReleaseSchemeAuthResultResetEvent} = require('../../enum/rabbit-mq-publish-event')

module.exports = class ReleaseSchemeAuthChangedEventHandler {

    constructor(app) {
        this.app = app
        this.releaseAuthResultProvider = app.dal.releaseAuthResultProvider
        this.releaseSchemeAuthRelationProvider = app.dal.releaseSchemeAuthRelationProvider
    }

    /**
     * 发行的某个版本授权结果发行变更事件处理
     */
    async handler({schemeId}) {

        const {app} = this
        const {releaseId, version} = await this.releaseAuthResultProvider.findOne({schemeId})
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
}