/**
 * Created by yuliang on 2017/9/5.
 */

const rabbitClient = require('./helper/rabbit_mq_client')

module.exports = {
    get rabbitClient() {
        return rabbitClient.Instance
    },

    initRabbitClient(){
        return new rabbitClient(this.config.rabbitMq)
    }
}