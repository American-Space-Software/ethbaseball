import path, { dirname, join, resolve } from 'path'
import webpack from 'webpack'

import fs from "fs"
import { createRequire } from 'module'

import { fileURLToPath } from 'url'
const require = createRequire(import.meta.url)

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')

const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const HTMLInlineCSSWebpackPlugin = require("html-inline-css-webpack-plugin").default
const TerserPlugin = require("terser-webpack-plugin")


const configPath = join(
  dirname(fileURLToPath(import.meta.url)),
  './package.json'
);
const packageConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'))



const VERSION = JSON.stringify(packageConfig.version)
const BUILD_ID = JSON.stringify(process.env.BUILD_ID ?? Date.now().toString())


// import 'dotenv/config'

let browserConfig = {
  entry: './src/web/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: 'ts-loader'
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },


      {
        test: /\.(png|jpe?g|gif|svg|eot|ttf|woff|woff2|webp)$/,
        type: 'asset/resource',
      },
      {
        test: /\.f7.html$/,
        use: ['framework7-loader']
      },
      {
        test: /\.eta?$/,
        type: 'asset/source'
      }
    ]
  },
  resolve: {
    extensions: ['*', '.js', '.jsx', '.tsx', '.ts'],
    extensionAlias: {
      ".js": [".js", ".ts"]
    },
    alias: {
      buffer: 'buffer',
      process: 'process/browser.js'
    },
    fallback: {
      "path": require.resolve("path-browserify"),
      "util": require.resolve("util/"),
      "assert": require.resolve("assert/"),
      "stream": require.resolve("stream-browserify"),
      "os": require.resolve("os-browserify/browser"),
      "http": require.resolve("stream-http"),
      "https": require.resolve("https-browserify"),
      "zlib": require.resolve("browserify-zlib"),
      "crypto": require.resolve("crypto-browserify"),
      "dgram": require.resolve("dgram-browserify"),
      "child_process": false,
      "fs": false
    }
  },
  plugins: [

    new CleanWebpackPlugin({
      dry: false,
      dangerouslyAllowCleanPatternsOutsideProject: true,
      cleanOnceBeforeBuildPatterns: [
        resolve('public/js/**')
      ],

    }),


    new webpack.ProvidePlugin({
      process: 'process/browser.js',
    }),

    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),

    new webpack.DefinePlugin({
      VERSION: VERSION      
    }),

    new MiniCssExtractPlugin({
      filename: "[name].css",
      chunkFilename: "[id].css"
    }),

    new HTMLInlineCSSWebpackPlugin(),

    // //Index page for website
    // new HtmlWebpackPlugin({
    //   inject: false,
    //   title: 'Ethereum Baseball League',
    //   // favicon: 'src/html/favicon.ico',
    //   template: 'src/web/html/index.html',
    //   filename: 'index.html'
    // }),

    {
      apply: (compiler) => {

        compiler.hooks.environment.tap('BuildManifest', async (params) => {
          
          if (fs.existsSync(`public/apple-touch-icon.png`)) {
            fs.rmSync(`public/apple-touch-icon.png`)
          }

          fs.copyFileSync(`src/web/ebl-192.png`, `public/ebl-192.png`)
          fs.copyFileSync(`src/web/ebl-512.png`, `public/ebl-512.png`)
          fs.copyFileSync(`src/web/apple-touch-icon.png`, `public/apple-touch-icon.png`)

          fs.copyFileSync(`src/web/html/images/logo.png`, `public/logo.png`)
          fs.copyFileSync(`src/web/html/images/logo-small.png`, `public/logo-small.png`)

          fs.copyFileSync(`src/web/html/images/screenshots/game.png`, `public/game.png`)


          fs.copyFileSync(`src/web/html/images/screenshots/home_wide.png`, `public/home_wide.png`)
          fs.copyFileSync(`src/web/html/images/screenshots/home.png`, `public/home.png`)

          // let svgContent = fs.readFileSync(`public/manifest-icon.svg`)

          // let png = await convert(svgContent, {
          //   height: 180,
          //   width: 180,
          //   puppeteer: { 
          //     args: ['--no-sandbox', '--disable-setuid-sandbox'] 
          //   }
          // })
    
          // fs.writeFileSync(`public/apple-touch-icon.png`, png)

          fs.writeFileSync(`public/app.webmanifest`, JSON.stringify({
            "name": "Ethereum Baseball League",
            "short-name": "EBL",
            "short_name": "EBL",
            "description": `Play EBL`,
            "display": "standalone",
            "theme_color": "#0a3161",
            "theme-color": "#0a3161",
            "background_color": "#0a3161",
            "icons": [
              {
                "src": "ebl-192.png",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "any"
              },
              {
                "src": "ebl-512.png",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "any"
              }

            ],
    
            "start_url": "/",
            "id": "/",

            "screenshots": [
                {
                  "src": "home_wide.png",
                  "sizes": "1909x849",
                  "type": "image/png",
                  "form_factor": "wide",
                  "label": "Home"
                },
                {
                  "src": "home.png",
                  "sizes": "358x770",
                  "type": "image/png",
                  "label": "Home"
                }
            ]

          }))

        })
      
      }
    }

  ],
  output: {
    library: "ebl",
    filename: `js/[name]-${BUILD_ID.replace('"', '').replace('"', '')}.ebl.js`,
    path: path.resolve(__dirname, 'public')
  },
  optimization: {
    usedExports: true,
    runtimeChunk: 'single',
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        },

      }
    }
  },

}

let serviceWorkerConfig = {
  entry: './src/web/sw.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: '/node_modules/',
        loader: 'ts-loader',
      }
    ],
  },

  output: {
    filename: `sw-${BUILD_ID.replace('"', '').replace('"', '')}.js`,
    path: path.resolve(__dirname, 'public'),
  },

  plugins: [

    new CleanWebpackPlugin({
      dry: false,
      dangerouslyAllowCleanPatternsOutsideProject: true,
      cleanOnceBeforeBuildPatterns: [
        resolve('public/sw*')
      ],

    }),

    new webpack.ProvidePlugin({
      process: 'process/browser.js',
    }),

    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),



    new webpack.DefinePlugin({
      VERSION: VERSION
    })
  ],

  optimization: {
    minimizer: [new TerserPlugin()],
  }
}


let engineConfig = {
  entry: "./src/engine/index.ts",
  target: "node",
  externals: ['sequelize', 'sequelize-typescript', 'mariadb', 'discord.js', 'umzug', 'libp2p', 'chatgpt' ],
  externalsPresets: { 
    node: true 
  },    
  experiments: {
    outputModule: true
  },
  resolve: {
    extensions: ['.*', '.js', '.jsx', '.tsx', '.ts'],
    extensionAlias: {
      ".js": [".js", ".ts"]
    },
    fallback: {
      "fs": false
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: 'ts-loader'
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.node$/,
        loader: "node-loader",
      },
      {
        test: /\.eta?$/,
        type: 'asset/source'
      }
    ]
  },  
  output: {
    filename: 'engine.js',
    libraryTarget: "module",
    library: {
      type: "module"
    },
    chunkFormat: 'module',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [

    // new webpack.ProvidePlugin({
    //   fetch: ['node-fetch', 'default'],
    // }),

    new webpack.DefinePlugin({
      VERSION: VERSION      
    }),

    {
      apply: (compiler) => {

        compiler.hooks.environment.tap('BuildContractsPlugin', (params) => {
          createContractsJSON()
        })
      
      }
    }

  ]
}

let createCarConfig = Object.assign(Object.assign({}, engineConfig), {
    entry: "./src/engine/create-car.ts",

    output: {
      filename: 'create-car.js',
      libraryTarget: "module",
      library: {
        type: "module"
      },
      chunkFormat: 'module',
      path: path.resolve(__dirname, 'dist'),
    },

    plugins: [
      new webpack.DefinePlugin({
        VERSION: VERSION      
      }),
    ]
  }
)

let webServerConfig = {
  entry: "./src/web-server/index.ts",
  target: "node",
  externals: ['sequelize', 'sequelize-typescript', 'mariadb', 'express', 'discord.js', 'umzug', 'chatgpt'],
  externalsPresets: { 
    node: true 
  },    
  experiments: {
    outputModule: true
  },
  resolve: {
    extensions: ['.*', '.js', '.jsx', '.tsx', '.ts'],
    extensionAlias: {
      ".js": [".js", ".ts"]
    },
    fallback: {
      "fs": false
    }
  },
  module: {
    rules: [

      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: 'ts-loader'
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },

      {
        test: /\.node$/,
        loader: "node-loader",
      },
      {
        test: /\.eta?$/,
        type: 'asset/source'
      }

    ]
  },  
  output: {
    filename: 'web-server.js',
    libraryTarget: "module",
    library: {
      type: "module"
    },
    chunkFormat: 'module',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
    // new webpack.ProvidePlugin({
    //   fetch: ['node-fetch', 'default'],
    // }),

    new webpack.DefinePlugin({
      VERSION: VERSION,
      BUILD_ID: BUILD_ID.replace('"', '').replace('"', '')
    })
    
  ]
}

let indexConfig = {
  entry: "./src/index.ts",
  target: "node",
  externals: ['sequelize', 'sequelize-typescript', 'mariadb', 'discord.js', 'umzug', 'libp2p', 'chatgpt', 'express' ],
  externalsPresets: { 
    node: true 
  },    
  experiments: {
    outputModule: true
  },
  resolve: {
    extensions: ['.*', '.js', '.jsx', '.tsx', '.ts'],
    extensionAlias: {
      ".js": [".js", ".ts"]
    },
    fallback: {
      "fs": false
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: 'ts-loader'
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.node$/,
        loader: "node-loader",
      },
      {
        test: /\.eta?$/,
        type: 'asset/source'
      }
    ]
  },  
  output: {
    filename: 'index.js',
    libraryTarget: "module",
    library: {
      type: "module"
    },
    chunkFormat: 'module',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [

    // new webpack.ProvidePlugin({
    //   fetch: ['node-fetch', 'default'],
    // }),

    new webpack.DefinePlugin({
      VERSION: VERSION,
      BUILD_ID: BUILD_ID.replace('"', '').replace('"', '')
    }),

    {
      apply: (compiler) => {

        compiler.hooks.environment.tap('BuildContractsPlugin', (params) => {
          
          createContractsJSON()


        })
      
      }
    }

  ]
}

let deployCommandsConfig = {
  entry: "./src/engine/deploy-commands.ts",
  target: "node",
  externals: ['sequelize', 'sequelize-typescript', 'mariadb', 'express', 'discord.js', 'umzug'],
  externalsPresets: { 
    node: true 
  },    
  experiments: {
    outputModule: true
  },
  resolve: {
    extensions: ['.*', '.js', '.jsx', '.tsx', '.ts'],
    extensionAlias: {
      ".js": [".js", ".ts"]
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: 'ts-loader'
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.node$/,
        loader: "node-loader",
      },
    ]
  },  
  output: {
    filename: 'deploy-commands.js',
    libraryTarget: "module",
    library: {
      type: "module"
    },
    chunkFormat: 'module',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
    // new CleanWebpackPlugin({
    //   dangerouslyAllowCleanPatternsOutsideProject: true
    // }),

    new webpack.ProvidePlugin({
      fetch: ['node-fetch', 'default'],
    }),



    

  ]
}


function createContractsJSON() {

  let contractJSON:any = {}

  let contracts = ['Diamonds']

  for (let contract of contracts) {

    //Get contracts and put them in a format we can inject into our services
    let theJSON = require(`./artifacts/hardhat/contracts/${contract}.sol/${contract}.json`)

    contractJSON[contract] = {
        abi: theJSON.abi,
        name: theJSON.contractName,
        bytecode: theJSON.bytecode,
        deployedBytecode: theJSON.deployedBytecode
    }


  }

  fs.writeFileSync('./contracts.json', JSON.stringify(contractJSON))
}




let web = () => { return [browserConfig, webServerConfig, serviceWorkerConfig] }
let discord = () => { return [engineConfig] }

export {
  web, discord
}

export default () => {
  return [deployCommandsConfig, browserConfig, webServerConfig, engineConfig, indexConfig, createCarConfig, serviceWorkerConfig]
}

