'use strict'

/**
 * 基于资源分享策略授权
 * @param app
 * @returns {{}}
 */
module.exports = app => {
    const dataProvider = app.dataProvider

    return {
        async authorization(resourcePolicy, userInfo, contractInfo) {
            
        }
    }
}