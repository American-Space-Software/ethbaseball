import packageConfig from "../package.json" with { type: 'json' };


import arg from 'arg'


class ProcessConfig {

    static async getConfig() {

        let theArgs = ProcessConfig.parseArgumentsIntoOptions(process.argv)

        let config:any = {}

        config.runDir = process.env.INIT_CWD ? process.env.INIT_CWD : "./"
        config.publicPath = process.env.INIT_CWD ? `${process.env.INIT_CWD}/public` : "./public" 
        config.VERSION = packageConfig.version
        config.universe = process.env.UNIVERSE_ADDRESS
        config.clear = theArgs.clear
        config.generate = theArgs.generate

        config.web = process.env.WEB

        if (!config.web) {
            config.web = "http://localhost:8080"

        }

        return config

    }

    static parseArgumentsIntoOptions(rawArgs) {

        const args = arg(
        {
            '--clear': String,
            '--generate': String

        },
        {
            argv: rawArgs.slice(2),
            permissive: true
        }
        )
    
        return {
            clear:  args['--clear'] == "true",
            generate:  args['--generate'] == "true"

        }
    
    }

}

export {
    ProcessConfig
}