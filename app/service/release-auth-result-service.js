'use strict'

const lodash = require('lodash')
const Service = require('egg').Service
const authCodeEnum = require('../enum/auth-code')
const {ArgumentError} = require('egg-freelog-base/error')
const authService = require('../authorization-service/process-manager')
const commonAuthResult = require('../authorization-service/common-auth-result')

module.exports = class ReleaseSchemeAuthResultService extends Service {

    constructor({app}) {
        super(...arguments)
        this.releaseAuthResultProvider = app.dal.releaseAuthResultProvider
    }

    /**
     * presentable发行侧授权
     * @param presentableInfo
     * @param presentableAuthTree
     * @returns {Promise<void>}
     */
    async presentableReleaseSideAuth(presentableInfo, presentableAuthTree) {

        const {ctx} = this
        const {authTree} = presentableAuthTree


        this._getSchemePracticalUsedReleases(releaseSchemes, presentableAuthTree)

    }
}