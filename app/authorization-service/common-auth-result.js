/**
 * Created by yuliang on 2017/11/14.
 */

'use strict'

module.exports = class CommonAuthResult {

    constructor(authCode = 0, data) {
        this.authCode = authCode
        this.data = data || {}
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
     * 转换object对象
     * @returns {{isAuth: boolean, authCode: *, data: {}, errors: Array}}
     */
    toObject() {
        return {
            isAuth: this.isAuth,
            authCode: this.authCode,
            data: this.data,
            errors: this.errors
        }
    }
}