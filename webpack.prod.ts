//@ts-nocheck
import { merge } from 'webpack-merge'
import common from './webpack.common.js'
import TerserPlugin from 'terser-webpack-plugin'


let configs = common()

let mainConfigs = []

for (let config of configs) {

    mainConfigs.push(merge(config, {
        mode: 'production',
        devtool: 'source-map',
        optimization: {
            nodeEnv: false,

            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        keep_classnames: true,
                        keep_fnames: true,
                    },
                }),
            ]


        }
    }))

}




export default mainConfigs

