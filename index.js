/**
 * Created by yuliang on 2017/8/17.
 */

require('egg').startCluster({
    baseDir: __dirname,
    port: process.env.PORT || 7008,
    workers: 1
});


// var Kardia = require('kardia');
// var kardia = Kardia.start({name: "auth", host: '0.0.0.0', port: 12900});
// kardia.registerHealthcheck({
//     handler: (callback, currentStatus) => {
//         console.log(currentStatus)
//         callback()
//     }
// })
//
// console.log(kardia.getConsulHealthcheck())
