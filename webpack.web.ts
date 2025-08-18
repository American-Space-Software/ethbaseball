//@ts-nocheck
import { merge } from 'webpack-merge'
import { web } from './webpack.common.js'


let configs = web()

let mainConfigs = []

for (let config of configs) {

    mainConfigs.push(merge(config, {
        mode: 'production',
        devtool: 'source-map',
        optimization: {
            nodeEnv: false
        }
    }))

}




export default mainConfigs

