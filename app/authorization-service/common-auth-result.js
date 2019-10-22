/**
 * Created by yuliang on 2017/11/14.
 */

'use strict'

const authCodeEnum = require('../enum/auth-code')

module.exports = class CommonAuthResult {

    constructor(authCode = 0, data = {}) {
        this.authCode = authCode
        this.testAuthCode = 0
        this.data = data
        this.errors = []
    }

    /**
     * 新增错误
     * @param error
     */
    addError(error) {
        this.errors.push(error)
    }

    /**
     * 是否授权通过
     * @returns {boolean}
     */
    get isAuth() {
        return this.authCode >= 200 && this.authCode <= 299
    }

    /**
     * 是否通过测试授权
     * @returns {boolean}
     */
    get isTestAuth() {
        return this.testAuthCode === authCodeEnum.BasedOnNodeContractTestAuth || this.testAuthCode === authCodeEnum.BasedOnReleaseContractTestAuth
    }

    /**
     * JSON序列化
     * @returns {{isAuth: boolean, authCode: *, data: {}, errors: Array}}
     */
    toJSON() {
        return {
            isAuth: this.isAuth,
            authCode: this.authCode,
            data: this.data,
            errors: this.errors
        }
    }
}